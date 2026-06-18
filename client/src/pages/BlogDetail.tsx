// Rose City Stays Blog Detail Page — reads from DB via tRPC
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Calendar, Clock, User, ArrowLeft } from "lucide-react";
import { Streamdown } from "streamdown";
import { useSEO } from "@/hooks/useSEO";
import { trpc } from "@/lib/trpc";

export default function BlogDetail() {
  const [match, params] = useRoute("/blog/:slug");

  const { data: article, isLoading, isError } = trpc.blog.bySlug.useQuery(
    { slug: params?.slug ?? "" },
    { enabled: !!params?.slug }
  );

  useSEO({
    title: article ? `${article.title} | Rose City Stays Blog` : "Blog | Rose City Stays",
    description: article?.metaDescription || article?.excerpt || "",
    ogImage: article?.featuredImage ?? undefined,
    keywords: article ? (article.tags as string[]) : [],
  });

  if (!match) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1">
          <Skeleton className="w-full aspect-video" />
          <div className="container max-w-4xl py-12 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isError || !article) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-3xl font-light mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Article Not Found
            </h1>
            <Link href="/blog">
              <Button className="bg-primary text-primary-foreground rounded-full">Back to Blog</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Back Button */}
        <div className="py-6 px-4 border-b border-border">
          <div className="container max-w-4xl">
            <Link href="/blog">
              <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
                Back to Blog
              </Button>
            </Link>
          </div>
        </div>

        {/* Featured Image — show image if available, otherwise a slim accent bar */}
        {article.featuredImage ? (
          <div className="w-full aspect-video bg-muted overflow-hidden">
            <img src={article.featuredImage} alt={article.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-1.5 bg-gradient-to-r from-primary via-primary/60 to-primary/20" />
        )}

        {/* Article Header */}
        <section className="py-12 px-4 border-b border-border">
          <div className="container max-w-4xl">
            <div className="mb-4 flex items-center gap-2">
              <span className="badge-mauve">{article.category}</span>
              {article.aiGenerated === 1 && (
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">AI Generated</span>
              )}
            </div>

            <h1 className="text-4xl lg:text-5xl font-light mb-6 text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span style={{ fontFamily: "var(--font-body)" }}>{article.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span style={{ fontFamily: "var(--font-body)" }}>
                  {new Date(article.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span style={{ fontFamily: "var(--font-body)" }}>{article.readTime} min read</span>
              </div>
            </div>
          </div>
        </section>

        {/* Article Content */}
        <section className="py-12 px-4">
          <div className="container max-w-4xl">
            <div className="prose prose-sm max-w-none" style={{ fontFamily: "var(--font-body)" }}>
              <Streamdown>{article.content}</Streamdown>
            </div>
          </div>
        </section>

        {/* Tags */}
        {(article.tags as string[]).length > 0 && (
          <section className="py-8 px-4 border-t border-border">
            <div className="container max-w-4xl">
              <div className="flex flex-wrap gap-2">
                {(article.tags as string[]).map((tag) => (
                  <span key={tag} className="text-xs px-3 py-1 bg-muted text-muted-foreground rounded-full" style={{ fontFamily: "var(--font-body)" }}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-12 px-4 bg-primary/5 border-t border-border">
          <div className="container max-w-4xl text-center">
            <h2 className="text-2xl font-light mb-3 text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Ready to Visit Tyler?
            </h2>
            <p className="text-muted-foreground mb-6" style={{ fontFamily: "var(--font-body)" }}>
              Book a Rose City Stays property and experience everything you just read about.
            </p>
            <Link href="/#properties">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8">
                Browse Properties
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
