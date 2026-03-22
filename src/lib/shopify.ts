import crypto from "crypto";
import type { Store, ShopifyOrder } from "@/types";

const ORDERS_QUERY = `
  query getOrders($cursor: String, $query: String) {
    orders(first: 50, after: $cursor, query: $query) {
      edges {
        node {
          id
          name
          tags
          totalPriceSet {
            shopMoney { amount currencyCode }
          }
          currentTotalPriceSet {
            shopMoney { amount currencyCode }
          }
          totalRefundedSet {
            shopMoney { amount currencyCode }
          }
          displayFinancialStatus
          cancelledAt
          createdAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * Fetch orders from a Shopify store using the Admin GraphQL API.
 * Supports filtering by tag(s) and/or date to avoid pulling unnecessary data.
 */
export async function fetchShopifyOrders(
  store: Store,
  options?: {
    sinceDate?: string;
    tags?: string[];
    orderName?: string;
  }
): Promise<ShopifyOrder[]> {
  const allOrders: ShopifyOrder[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  // Build query filter
  const queryParts: string[] = [];
  if (options?.orderName) {
    queryParts.push(`name:${options.orderName}`);
  }
  if (options?.sinceDate) {
    queryParts.push(`updated_at:>='${options.sinceDate}'`);
  }
  if (options?.tags && options.tags.length > 0) {
    // Shopify query: tag:jan OR tag:piet
    const tagFilter = options.tags.map((t) => `tag:'${t}'`).join(" OR ");
    queryParts.push(`(${tagFilter})`);
  }
  const query = queryParts.length > 0 ? queryParts.join(" AND ") : null;

  while (hasNextPage) {
    const response: Response = await fetch(
      `https://${store.shopify_domain}/admin/api/2024-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": store.access_token,
        },
        body: JSON.stringify({
          query: ORDERS_QUERY,
          variables: { cursor, query },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Shopify API error for ${store.name}: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(
        `Shopify GraphQL error: ${JSON.stringify(data.errors)}`
      );
    }

    const orders = data.data.orders;

    for (const edge of orders.edges) {
      const node = edge.node;
      const tags = Array.isArray(node.tags)
        ? node.tags
        : typeof node.tags === "string"
        ? node.tags.split(",").map((t: string) => t.trim().toLowerCase())
        : [];

      allOrders.push({
        ...node,
        tags,
      });
    }

    hasNextPage = orders.pageInfo.hasNextPage;
    cursor = orders.pageInfo.endCursor;

    // Rate limiting
    if (hasNextPage) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return allOrders;
}

/**
 * Register webhooks for a store via the Shopify REST Admin API.
 * Called automatically after OAuth completes.
 */
export async function registerWebhooks(
  shopDomain: string,
  accessToken: string,
  appUrl: string
): Promise<{ success: boolean; errors: string[] }> {
  const topics = ["orders/updated", "orders/cancelled", "refunds/create"];
  const errors: string[] = [];

  for (const topic of topics) {
    const res = await fetch(
      `https://${shopDomain}/admin/api/2024-01/webhooks.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          webhook: {
            topic,
            address: `${appUrl}/api/shopify/webhook`,
            format: "json",
          },
        }),
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      // 422 with "already exists" is fine — webhook was registered before
      const msg = JSON.stringify(data.errors || data);
      if (res.status === 422 && msg.includes("already exists")) {
        continue;
      }
      errors.push(`${topic}: ${msg}`);
    }
  }

  return { success: errors.length === 0, errors };
}

/**
 * Verify Shopify webhook signature using the app's client secret
 */
export function verifyShopifyWebhook(
  body: string,
  hmacHeader: string,
  secret: string
): boolean {
  const hash = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(hmacHeader)
  );
}

/**
 * Extract numeric Shopify order ID from GID
 * "gid://shopify/Order/123456789" -> 123456789
 */
export function parseShopifyGid(gid: string): number {
  const match = gid.match(/\/(\d+)$/);
  if (!match) throw new Error(`Invalid Shopify GID: ${gid}`);
  return parseInt(match[1], 10);
}
