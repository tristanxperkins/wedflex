import Nav from "./components/Nav";

export default function Home() {
  return (
    <main>
      <Nav />
      <section className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">Welcome to WedFlex</h1>
        <p className="opacity-80">Sign in to start testing the flows.</p>
      </section>
    </main>
  );
}
