import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Routes die publiek toegankelijk zijn (zonder login)
  publicRoutes: ["/api/shopify/webhook"],
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
