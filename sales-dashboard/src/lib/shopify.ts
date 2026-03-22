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
          customer {
            displayName
          }
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
 * Fetch orders from a Shopify store using the Admin GraphQL API
 */
export async function fetchShopifyOrders(
  store: Store,
  sinceDate?: string
): Promise<ShopifyOrder[]> {
  const allOrders: ShopifyOrder[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  // Build query filter
  const queryParts: string[] = [];
  if (sinceDate) {
    queryParts.push(`updated_at:>='${sinceDate}'`);
  }
  const query = queryParts.length > 0 ? queryParts.join(" AND ") : null;

  while (hasNextPage) {
    const response = await fetch(
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
      // Parse tags string into array
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

    // Rate limiting: Shopify allows 2 requests per second for GraphQL
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return allOrders;
}

/**
 * Verify Shopify webhook signature
 */
export function verifyShopifyWebhook(
  body: string,
  hmacHeader: string,
  secret: string
): boolean {
  const crypto = require("crypto");
  const hash = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");
  return hash === hmacHeader;
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
