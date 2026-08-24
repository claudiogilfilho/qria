import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useParams } from "wouter";
import BrandWorkspace from "./BrandWorkspace";

type DirectionRow = {
  id: number;
  round: number;
  optionKey: string;
  title: string;
  status: string;
  logoImageUrl: string | null;
  content: Record<string, unknown>;
};

type DirectionData = {
  title?: string;
  essence?: string;
  visualStyle?: string;
  palette?: Array<{ name: string; hex: string; use: string }>;
  typography?: { display?: string };
};

const optionLabels = ["A", "B", "C", "D", "E"];

export default function BrandWorkspaceFive() {
  const params = useParams<{ brandId: string }>();
  const brandId = Number(params.brandId);
  const utils = trpc.useUtils();
  const workspace = trpc.brand.getWorkspace.useQuery({ brandId }, { enabled: Number.isFinite(brandId) && brandId > 0 });
  const choose = trpc.brand.choose.useMutation({
    onSuccess: () => {
      toast.success("Direção escolhida. O seu brand book está pronto.");
      utils.brand.getWorkspace.invalidate({ brandId });
    },
    onError: error => toast.error(error.message),
  });
  const regenerate = trpc.brand.regenerate.useMutation({
    onSuccess: () => {
      toast.success("Nova rodada criada com outras cinco direções.");
      utils.brand.getWorkspace.invalidate({ brandId });
    },
    onError: error => toast.error(error.message),
  });

  if (!workspace.data) return <BrandWorkspace />;
  const { brand, session, directions, selectedDirection } = workspace.data;
  if (!session || selectedDirection || session.status === "generating") return <BrandWorkspace />;

  const activeDirections = directions
    .filter(direction => direction.round === session.currentRound && direction.status === "proposed")
    .sort((a, b) => a.id - b.id) as DirectionRow[];

  if (activeDirections.length !== 5) return <BrandWorkspace />;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-5 sm:py-8">
        <header className="border-b border-stone-200 pb-6">
          <p className="eyebrow">Rodada de exploração</p>
          <h1 className="mt-2 font-display text-5xl tracking-[-0.045em] text-ink">{brand.name}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">Escolha uma das cinco direções. Elas foram forçadas a explorar territórios diferentes de símbolo, composição, energia e cor — não apenas variações cosméticas da mesma marca.</p>
        </header>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {activeDirections.map((direction, index) => {
            const data = direction.content as DirectionData;
            return (
              <Card key={direction.id} className="overflow-hidden border-stone-200 bg-white shadow-none transition-all hover:-translate-y-1 hover:border-olive hover:shadow-[0_18px_45px_rgba(35,37,28,0.10)]">
                <CardContent className="p-0">
                  <div className="relative grid min-h-56 place-items-center overflow-hidden" style={{ background: data.palette?.[0]?.hex ?? "#E9E4D8" }}>
                    <div className="absolute left-5 top-5 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-xs font-semibold text-ink">{optionLabels[index]}</div>
                    {direction.logoImageUrl ? <img src={direction.logoImageUrl} alt={`Símbolo conceitual ${data.title ?? direction.title}`} className="h-32 w-32 rounded-2xl object-cover shadow-[0_14px_30px_rgba(0,0,0,0.15)]" /> : null}
                  </div>
                  <div className="p-6">
                    <p className="eyebrow">{data.visualStyle ?? "Direção visual"}</p>
                    <h2 className="mt-2 font-display text-3xl tracking-[-0.035em] text-ink">{data.title ?? direction.title}</h2>
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">{data.essence}</p>
                    <div className="mt-5 flex gap-1.5">{data.palette?.slice(0, 5).map(color => <span key={`${direction.id}-${color.hex}`} className="h-5 w-5 rounded-full border border-black/5" style={{ background: color.hex }} />)}</div>
                    <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4">
                      <span className="text-xs text-muted-foreground">{data.typography?.display}</span>
                      <Button disabled={choose.isPending || regenerate.isPending} onClick={() => choose.mutate({ sessionId: session.id, directionId: direction.id })} variant="ghost" className="h-8 rounded-full px-2 text-sm font-semibold text-ink hover:bg-sand">{choose.isPending && choose.variables?.directionId === direction.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Escolher <ChevronRight className="ml-1 h-4 w-4" /></>}</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-7 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-stone-300 bg-white/55 px-5 py-6 text-center sm:flex-row sm:text-left">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-stone-200 text-ink"><RefreshCw className="h-4 w-4" /></span>
          <div className="flex-1"><strong className="text-sm font-semibold text-ink">Não gostei de nenhuma.</strong><p className="mt-1 text-sm text-muted-foreground">Descarte esta rodada e abra cinco caminhos novos, evitando os conceitos que você acabou de rejeitar.</p></div>
          <Button disabled={regenerate.isPending || choose.isPending} onClick={() => regenerate.mutate({ sessionId: session.id })} variant="outline" className="shrink-0 rounded-full border-stone-300 bg-white text-ink hover:bg-sand">{regenerate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RefreshCw className="mr-2 h-4 w-4" /> Não gostei de nenhuma — gerar outras 5</>}</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
