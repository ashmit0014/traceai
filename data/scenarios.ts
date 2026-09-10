export type Log = {
  id: string;
  timestamp: string;
  service: string;
  level: string;
  message: string;
};
export type Metric = {
  id: string;
  metric: string;
  service: string;
  timestamp: string;
  value: number;
};
export type EvidenceBundle = {
  logs: Log[];
  metrics: Metric[];
  files: { path: string; content: string }[];
  deployments: {
    id: string;
    version: string;
    timestamp: string;
    commitId: string;
    service: string;
  }[];
  commits: { id: string; diff: string }[];
};
const buggy = `export async function createOrder(cart: Cart) {
  const lines = [];
  for (const item of cart.items) {
    const customer = await db.customer.findUnique({
      where: { id: cart.customerId }
    });
    lines.push(priceItem(item, customer.loyaltyTier));
  }
  return db.order.create({ data: { lines } });
}`;
export const fixedCode = `export async function createOrder(cart: Cart) {
  const customer = await db.customer.findUnique({
    where: { id: cart.customerId }
  });
  if (!customer) throw new Error('Customer not found');
  const lines = cart.items.map(item =>
    priceItem(item, customer.loyaltyTier)
  );
  return db.order.create({ data: { lines } });
}`;
const definitions = [
  {
    id: "n-plus-one",
    title: "Checkout latency regression",
    description:
      "Checkout API p95 latency increased from ~320 ms to ~3.8 seconds immediately after deployment v1.42. Find the root cause.",
    expected:
      "N+1 customer lookup inside the cart items loop in OrderService introduced in v1.42.",
    keywords: ["customer", "loop"],
    service: "order-service",
    signal:
      "db.customer.findUnique repeated 18 times for cart_id=cart_294 customer_id=c_821 trace_id=tr_982 db_duration_ms=3420",
    file: "services/order/OrderService.ts",
    code: buggy,
    diff: "@@ -3,3 +3,7 @@ createOrder(cart)\n   for (const item of cart.items) {\n-    lines.push(priceItem(item));\n+    const customer = await db.customer.findUnique({\n+      where: { id: cart.customerId }\n+    });\n+    lines.push(priceItem(item, customer.loyaltyTier));\n   }",
  },
  {
    id: "connection-pool",
    title: "Database connections exhausted",
    description:
      "Order requests return 503 during a traffic burst following v1.42.",
    expected:
      "Database connection pool exhaustion caused by unreleased clients on the error path.",
    keywords: ["connection", "release"],
    service: "order-service",
    signal:
      "pool_total=20 pool_idle=0 pool_waiting=146 acquire_timeout_ms=5000; error path skips client.release()",
    file: "services/order/repository.ts",
    code: "const client = await pool.connect();\nawait client.query(sql);\nclient.release(); // skipped when query throws",
    diff: "@@ repository\n-try { await client.query(sql); } finally { client.release(); }\n+await client.query(sql);\n+client.release();",
  },
  {
    id: "external-timeout",
    title: "Payment authorization timeouts",
    description:
      "Checkout requests time out while authorizing cards after the payment gateway degradation.",
    expected:
      "External payment API timeout caused by a slow upstream gateway without a bounded timeout.",
    keywords: ["payment", "timeout"],
    service: "payment-service",
    signal:
      "gateway=paygate upstream_duration_ms=30000 status=504 db_duration_ms=12; upstream timeout",
    file: "services/payment/gateway.ts",
    code: "return fetch(process.env.PAYMENT_URL + '/authorize', { method: 'POST' });",
    diff: "@@ gateway\n-return fetch(url, { signal: AbortSignal.timeout(2000) });\n+return fetch(url);",
  },
  {
    id: "memory-leak",
    title: "Customer pods repeatedly restarting",
    description:
      "Customer service memory grows steadily until pods are OOMKilled.",
    expected:
      "Memory leak from an unbounded request cache retaining customer payloads.",
    keywords: ["memory", "cache"],
    service: "customer-service",
    signal:
      "rss_mb=1950 heap_used_mb=1820 cache_entries=284010 restart_reason=OOMKilled; request cache never evicts",
    file: "services/customer/cache.ts",
    code: "const requestCache = new Map();\nexport function remember(id, payload) { requestCache.set(id, payload); }",
    diff: "@@ cache\n-const requestCache = new LRUCache({ max: 1000 });\n+const requestCache = new Map();",
  },
  {
    id: "cache-invalidation",
    title: "Stale prices at checkout",
    description:
      "Customers see old prices after catalog updates, despite successful database writes.",
    expected:
      "Cache invalidation bug deleting the wrong key prefix after price updates.",
    keywords: ["invalidation", "prefix"],
    service: "checkout-service",
    signal:
      "cache_read_key=price:sku_19 cache_delete_key=product:sku_19; stale_price=19.00 db_price=24.00",
    file: "services/checkout/prices.ts",
    code: "await redis.set('price:' + sku, price);\nawait redis.del('product:' + sku);",
    diff: "@@ updatePrice\n-await redis.del('price:' + sku);\n+await redis.del('product:' + sku);",
  },
  {
    id: "cpu-saturation",
    title: "Order worker CPU saturation",
    description:
      "Order workers reach 99% CPU and event-loop lag rises after v1.42.",
    expected:
      "CPU saturation from synchronous password hashing blocking the event loop.",
    keywords: ["cpu", "synchronous"],
    service: "order-service",
    signal:
      "cpu_percent=99 event_loop_lag_ms=1240 profiler_top=bcrypt.hashSync db_duration_ms=9",
    file: "services/order/worker.ts",
    code: "const receiptToken = bcrypt.hashSync(order.id, 14);",
    diff: "@@ worker\n-const receiptToken = await bcrypt.hash(order.id, 10);\n+const receiptToken = bcrypt.hashSync(order.id, 14);",
  },
  {
    id: "bad-env",
    title: "Payment service cannot authenticate",
    description:
      "Every payment authorization returns 401 after a production configuration change.",
    expected:
      "Bad environment variable points production payments at the sandbox API endpoint.",
    keywords: ["environment", "sandbox"],
    service: "payment-service",
    signal:
      "upstream_status=401 endpoint=https://sandbox.paygate.example credential_scope=production environment mismatch",
    file: "config/payment.env",
    code: "PAYMENT_URL=https://sandbox.paygate.example\nPAYMENT_CREDENTIAL_SCOPE=production",
    diff: "@@ production environment\n-PAYMENT_URL=https://api.paygate.example\n+PAYMENT_URL=https://sandbox.paygate.example",
  },
  {
    id: "deployment-config",
    title: "Checkout pods throttled after release",
    description:
      "Checkout throughput dropped immediately after deployment although traffic is unchanged.",
    expected:
      "Deployment configuration regression reduced the checkout CPU limit from 2 cores to 100 millicores.",
    keywords: ["cpu", "limit"],
    service: "checkout-service",
    signal:
      "container_cpu_cfs_throttled_ratio=0.92 cpu_limit=100m previous_cpu_limit=2000m request_rate=240",
    file: "deploy/checkout.yaml",
    code: "resources:\n  limits:\n    cpu: 100m\n    memory: 512Mi",
    diff: "@@ resources.limits\n-    cpu: 2000m\n+    cpu: 100m",
  },
];
export const scenarios = definitions.map((d, index) => {
  const logs: Log[] = [
    {
      id: `${d.id}:log:1`,
      timestamp: "2026-09-10T10:06:03.420Z",
      service: d.service,
      level: "ERROR",
      message: d.signal,
    },
    {
      id: `${d.id}:log:2`,
      timestamp: "2026-09-10T10:06:03.812Z",
      service: "checkout-service",
      level: "WARN",
      message: `POST /api/checkout status=${[1, 3, 6].includes(index) ? 503 : index === 2 ? 504 : 200} duration_ms=${index === 2 ? 30021 : 3812} trace_id=tr_982 cart_items=18${index === 0 ? " slo_breached=true" : ""}`,
    },
    {
      id: `${d.id}:log:3`,
      timestamp: "2026-09-10T10:06:03Z",
      service: "payment-service",
      level: "INFO",
      message:
        index === 6
          ? "authorize duration_ms=84 status=401 endpoint=sandbox.paygate.example"
          : index === 2
            ? "authorize duration_ms=30000 status=504"
            : "authorize duration_ms=94 status=200; upstream healthy",
    },
    {
      id: `${d.id}:log:4`,
      timestamp: "2026-09-10T09:56:02Z",
      service: d.service,
      level: "INFO",
      message: "health=ok release=v1.41 checkout_duration_ms=318",
    },
  ];
  if (index === 0)
    for (let i = 0; i < 18; i++)
      logs.push({
        id: `n-plus-one:log:${i + 5}`,
        timestamp: new Date(
          Date.UTC(2026, 8, 10, 10, 6, 0, i * 190),
        ).toISOString(),
        service: "order-service",
        level: "DEBUG",
        message: `SELECT * FROM customers WHERE id='c_821' duration_ms=${185 + (i % 8)} trace_id=tr_982 item_index=${i}`,
      });
  const metrics: Metric[] = [];
  for (let i = 0; i < 25; i++)
    for (const metric of [
      "p95_latency",
      "db_queries",
      "request_rate",
      "cpu_percent",
      "payment_latency",
      "memory_mb",
    ])
      metrics.push({
        id: `${d.id}:metric:${metric}:${i}`,
        metric,
        service:
          metric === "payment_latency"
            ? "payment-service"
            : metric === "db_queries"
              ? "order-service"
              : "checkout-service",
        timestamp: new Date(Date.UTC(2026, 8, 10, 9, 45 + i)).toISOString(),
        value:
          metric === "p95_latency"
            ? i < 15
              ? 320 + (i % 4) * 7
              : 3780 + (i % 4) * 35
            : metric === "db_queries"
              ? i < 15
                ? 1
                : index === 0
                  ? 18
                  : 1
              : metric === "request_rate"
                ? 240 + (i % 5) * 3
                : metric === "cpu_percent"
                  ? index === 5 && i >= 15
                    ? 99
                    : 32 + (i % 4)
                  : metric === "payment_latency"
                    ? index === 2 && i >= 15
                      ? 30000
                      : 94 + (i % 3)
                    : index === 3
                      ? 220 + i * 72
                      : 220 + (i % 9),
      });
  const evidence: EvidenceBundle = {
    logs,
    metrics,
    files: [
      { path: d.file, content: d.code },
      {
        path: "services/payment/health.ts",
        content:
          "export const upstreamHealth = { p95Ms: 96, errorRate: 0.001 };",
      },
    ],
    deployments: [
      {
        id: `${d.id}:deploy:142`,
        version: "v1.42",
        timestamp: "2026-09-10T10:00:00Z",
        commitId: "a82f4d",
        service: d.service,
      },
      {
        id: `${d.id}:deploy:141`,
        version: "v1.41",
        timestamp: "2026-09-09T14:20:00Z",
        commitId: "e71c09",
        service: d.service,
      },
    ],
    commits: [
      { id: "a82f4d", diff: `diff --git a/${d.file} b/${d.file}\n${d.diff}` },
      {
        id: "e71c09",
        diff: "@@ release v1.41\n+// Stable baseline; health checks passing",
      },
    ],
  };
  return {
    ...d,
    severity: d.id === "bad-env" ? ("critical" as const) : ("high" as const),
    evidence,
  };
});
