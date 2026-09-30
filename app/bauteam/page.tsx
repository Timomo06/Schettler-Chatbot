import BauTeamAssistant from "./BauTeamAssistant";
import "./bauteam.css";

export default async function BauTeamPage({ searchParams }: { searchParams: Promise<{ house?: string; houses?: string; site?: string }> }) {
  const { house, houses, site } = await searchParams;
  return <BauTeamAssistant houseSlug={house || ""} houseSlugs={(houses || "").split(",").filter(Boolean).slice(0, 3)} siteUrl={site || ""} />;
}
