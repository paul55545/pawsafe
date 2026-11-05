import Menu from "@/components/Menu";
import PlantScanner from "@/components/PlantScanner";
import Title from "@/components/Title";

export default function Home() {
  return (
    <>
      <Menu />
      {/* extra top padding keeps the logo clear of the menu button */}
      <main className="flex flex-1 flex-col items-center gap-6 px-6 pb-8 pt-16">
        <Title />
        <PlantScanner />
      </main>
    </>
  );
}
