import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, BookOpen, Plus, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

const statusLabel = {
  draft: "Rascunho",
  in_progress: "Em construção",
  selected: "Identidade definida",
} as const;

export default function Home() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const brands = trpc.brand.list.useQuery(undefined, { enabled: isAuthenticated });

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl px-1 py-5 sm:px-5 sm:py-8">
        <section className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-10 text-ivory shadow-[0_24px_70px_rgba(35,37,28,0.18)] sm:px-10 sm:py-14">
          <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full border border-white/10" />
          <div className="absolute right-20 top-20 h-36 w-36 rounded-full border border-champagne/30" />
          <div className="relative max-w-2xl">
            <div className="mb-7 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-champagne">
              <Sparkles className="h-3.5 w-3.5" /> Ateliê de identidade
            </div>
            <h1 className="font-display text-5xl leading-[0.92] tracking-[-0.045em] sm:text-6xl">
              Toda marca memorável começa com uma escolha bem feita.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-ivory/70 sm:text-lg">
              Conduza a estratégia, explore direções visuais e construa uma identidade consistente em um processo guiado por inteligência artificial.
            </p>
            <Button onClick={() => setLocation("/nova-marca")} className="mt-8 h-12 rounded-full bg-champagne px-6 text-sm font-semibold text-ink hover:bg-[#d7cd8e]">
              Iniciar uma marca <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Seu acervo</p>
              <h2 className="mt-2 font-display text-3xl tracking-[-0.03em] text-ink">Marcas em desenvolvimento</h2>
            </div>
            <Button variant="ghost" onClick={() => setLocation("/nova-marca")} className="hidden rounded-full text-ink hover:bg-sand sm:flex">
              <Plus className="mr-2 h-4 w-4" /> Nova marca
            </Button>
          </div>

          {brands.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[0, 1].map(item => <Skeleton className="h-48 rounded-3xl" key={item} />)}
            </div>
          ) : brands.data?.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {brands.data.map(brand => (
                <Card key={brand.id} className="group border-stone-200/80 bg-white/80 shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:border-champagne hover:shadow-[0_16px_35px_rgba(35,37,28,0.08)]">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sand font-display text-xl text-ink">
                        {brand.name.slice(0, 1).toUpperCase()}
                      </span>
                      <Badge variant="outline" className="border-stone-200 bg-ivory px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {statusLabel[brand.status]}
                      </Badge>
                    </div>
                    <h3 className="mt-6 font-display text-3xl tracking-[-0.03em] text-ink">{brand.name}</h3>
                    <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">{brand.description}</p>
                    <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4">
                      <span className="text-xs text-muted-foreground">Atualizada em {new Date(brand.updatedAt).toLocaleDateString("pt-BR")}</span>
                      <button onClick={() => setLocation(`/marca/${brand.id}`)} className="flex items-center gap-1 text-sm font-semibold text-ink transition-colors hover:text-olive">
                        Abrir <ArrowUpRight className="h-4 w-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-stone-300 bg-white/50 shadow-none">
              <CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-sand text-olive"><BookOpen className="h-6 w-6" /></span>
                <h3 className="mt-5 font-display text-3xl text-ink">Seu ateliê está pronto.</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Crie a primeira marca para iniciar o diagnóstico e descobrir direções visuais únicas.</p>
                <Button onClick={() => setLocation("/nova-marca")} variant="outline" className="mt-6 rounded-full border-stone-300 bg-white text-ink hover:bg-sand">Criar primeira marca</Button>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
