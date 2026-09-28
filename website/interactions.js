const root = document.documentElement
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
const menuButton = document.querySelector(".menu-toggle")
const navigation = document.querySelector(".site-nav")
const navigationLinks = [...document.querySelectorAll(".site-nav a")]
const observedSections = navigationLinks
  .map(link => document.querySelector(link.getAttribute("href")))
  .filter(Boolean)
const hero = document.querySelector(".hero")
const steps = document.querySelector(".steps")
const stepItems = [...document.querySelectorAll(".steps li")]

root.classList.add("has-js")

function closeMenu() {
  menuButton?.setAttribute("aria-expanded", "false")
  menuButton?.setAttribute("aria-label", "打开导航菜单")
  navigation?.classList.remove("is-open")
}

menuButton?.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true"
  menuButton.setAttribute("aria-expanded", String(!isOpen))
  menuButton.setAttribute("aria-label", isOpen ? "打开导航菜单" : "关闭导航菜单")
  navigation?.classList.toggle("is-open", !isOpen)
})
navigation?.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu))
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape")
    closeMenu()
})
window.addEventListener("resize", () => {
  if (window.innerWidth > 700)
    closeMenu()
}, { passive: true })

const revealItems = [...document.querySelectorAll("[data-reveal]")]
if (!reduceMotion && "IntersectionObserver" in window) {
  revealItems.forEach((item, index) => item.style.setProperty("--reveal-delay", `${(index % 4) * 65}ms`))
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting)
        return
      entry.target.classList.add("is-visible")
      observer.unobserve(entry.target)
    })
  }, { threshold: 0.14, rootMargin: "0px 0px -35px 0px" })
  revealItems.forEach(item => revealObserver.observe(item))
}
else {
  revealItems.forEach(item => item.classList.add("is-visible"))
}

let currentStep = -1
if (steps && stepItems.length && "IntersectionObserver" in window && !reduceMotion) {
  const stepObserver = new IntersectionObserver((entries) => {
    const current = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
    if (!current)
      return
    currentStep = stepItems.indexOf(current.target)
    stepItems.forEach((item, index) => item.classList.toggle("is-active", index === currentStep))
    steps.style.setProperty("--step-progress", `${(currentStep + 1) / stepItems.length}`)
  }, { rootMargin: "-35% 0px -45% 0px", threshold: [0, 0.3, 0.6] })
  stepItems.forEach(item => stepObserver.observe(item))
}

function updateNavigation() {
  let activeSection = null
  for (const section of observedSections) {
    if (section.getBoundingClientRect().top <= window.innerHeight * 0.4)
      activeSection = section
  }
  navigationLinks.forEach((link) => {
    link.classList.toggle("is-active", activeSection?.id === link.getAttribute("href").slice(1))
  })
}

let scrollFrame = 0
function updateScrollEffects() {
  scrollFrame = 0
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight
  root.style.setProperty("--page-progress", String(maxScroll > 0 ? window.scrollY / maxScroll : 0))
  updateNavigation()
  if (!hero || reduceMotion)
    return

  const offset = Math.min(hero.offsetHeight, Math.max(0, window.scrollY - hero.offsetTop))
  hero.style.setProperty("--grid-y", `${offset * 0.04}px`)
  hero.style.setProperty("--glow-y", `${offset * -0.1}px`)
  hero.style.setProperty("--outer-y", `${offset * 0.075}px`)
  hero.style.setProperty("--inner-y", `${offset * -0.05}px`)
  hero.style.setProperty("--frame-y", `${offset * 0.018}px`)
}

window.addEventListener("scroll", () => {
  if (!scrollFrame)
    scrollFrame = window.requestAnimationFrame(updateScrollEffects)
}, { passive: true })
window.addEventListener("resize", updateScrollEffects, { passive: true })
updateScrollEffects()

if (hero && window.matchMedia("(pointer: fine)").matches && !reduceMotion) {
  hero.addEventListener("pointermove", (event) => {
    const bounds = hero.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width - 0.5
    const y = (event.clientY - bounds.top) / bounds.height - 0.5
    hero.style.setProperty("--pointer-x", `${x * 8}px`)
    hero.style.setProperty("--tilt-x", `${y * -1.2}deg`)
    hero.style.setProperty("--tilt-y", `${x * 1.8}deg`)
  })
  hero.addEventListener("pointerleave", () => {
    hero.style.setProperty("--pointer-x", "0px")
    hero.style.setProperty("--tilt-x", "0deg")
    hero.style.setProperty("--tilt-y", "0deg")
  })
}
