import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Khu vực riêng tư hoặc vô nghĩa với người tìm kiếm — chặn để crawler
      // dồn ngân sách quét vào tin đăng.
      disallow: ["/api/", "/chat", "/me", "/dev/", "/login", "/register", "/verify", "/reset-password", "/forgot-password"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
