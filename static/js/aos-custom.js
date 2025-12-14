// 🌿 Custom AOS-like Scroll Animation for all sections
document.addEventListener("DOMContentLoaded", () => {
  const elements = document.querySelectorAll("[data-aos]");

  const handleScroll = () => {
    const windowHeight = window.innerHeight;

    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const offset = el.dataset.aosOffset ? parseInt(el.dataset.aosOffset) : 100;

      if (rect.top < windowHeight - offset) {
        el.classList.add("aos-animate");
      } else {
        el.classList.remove("aos-animate"); // optional: remove if you want one-time animation
      }
    });
  };

  window.addEventListener("scroll", handleScroll);
  handleScroll(); // Run once on load
});
