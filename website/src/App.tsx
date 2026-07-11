import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Features from "./components/Features";
import Capture from "./components/Capture";
import Safety from "./components/Safety";
import Faq from "./components/Faq";
import DownloadCta from "./components/DownloadCta";
import Footer from "./components/Footer";

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <Features />
        <Capture />
        <Safety />
        <Faq />
        <DownloadCta />
      </main>
      <Footer />
    </>
  );
}
