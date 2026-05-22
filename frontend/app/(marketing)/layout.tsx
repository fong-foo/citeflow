import { Navbar } from "@/components/navbar";
import { Starfield } from "@/components/starfield";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Starfield />
      <Navbar />
      {children}
    </>
  );
}
