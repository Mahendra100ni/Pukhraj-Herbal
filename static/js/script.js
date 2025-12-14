(function() {
    'use strict';

    // Add 'js' class to HTML
    document.documentElement.classList.add('js');
    

    // ============================================
    // MOBILE MENU & DROPDOWN SYSTEM
    // ============================================
    
    const navToggle = document.querySelector('.nav-toggle');
    const siteHeader = document.querySelector('.site-header');
    const mainNav = document.querySelector('.main-nav');
    const dropdownParent = document.querySelector('.has-dropdown');
    const body = document.body;

    // Toggle mobile menu
    if (navToggle && siteHeader) {
        navToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        siteHeader.classList.toggle('open');
        body.style.overflow = siteHeader.classList.contains('open') ? 'hidden' : '';
        });
    }

    // Handle dropdown on mobile
    if (dropdownParent) {
        const dropdownLink = dropdownParent.querySelector('a');
        
        if (dropdownLink) {
        dropdownLink.addEventListener('click', function(e) {
            // Only prevent default on mobile
            if (window.innerWidth <= 768) {
            e.preventDefault();
            e.stopPropagation();
            
            // Toggle active class
            dropdownParent.classList.toggle('active');
            
            // Rotate arrow
            const arrow = this.querySelector('.dropdown-arrow');
            if (arrow) {
                arrow.style.transform = dropdownParent.classList.contains('active') 
                ? 'rotate(180deg)' 
                : 'rotate(0deg)';
            }
            }
        });
        }
    }

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (siteHeader && !e.target.closest('.site-header')) {
        if (siteHeader.classList.contains('open')) {
            siteHeader.classList.remove('open');
            body.style.overflow = '';
            
            // Also close dropdown
            if (dropdownParent) {
            dropdownParent.classList.remove('active');
            }
        }
        }
    });

    // Prevent menu close when clicking inside
    if (mainNav) {
        mainNav.addEventListener('click', function(e) {
        e.stopPropagation();
        });
    }

    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
        if (window.innerWidth > 768) {
            if (siteHeader) {
            siteHeader.classList.remove('open');
            body.style.overflow = '';
            }
            if (dropdownParent) {
            dropdownParent.classList.remove('active');
            const arrow = dropdownParent.querySelector('.dropdown-arrow');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
            }
        }
        }, 250);
    });

    // ============================================
    // SEARCH SUGGESTION SYSTEM
    // ============================================
    const SEARCH_API = "http://127.0.0.1:5000/products";
    let allProducts = [];
    let allCategories = [];

    async function loadSearchData() {
    const res = await fetch(SEARCH_API);
    const data = await res.json();

    allCategories = Object.keys(data);

    allProducts = [];
    for (let cat in data) {
        data[cat].forEach(p => {
        allProducts.push({ ...p, category: cat });
        });
    }
    }

    loadSearchData();

    // Show suggestions live
    document.getElementById("searchInput").addEventListener("input", function () {
    let q = this.value.trim().toLowerCase();
    let box = document.getElementById("suggestionBox");

    if (!q) {
        box.style.display = "none";
        return;
    }

    let results = [];

    // Category match
    allCategories.forEach(cat => {
        if (cat.toLowerCase().includes(q)) {
        results.push({ type: "category", label: cat.replace(/-/g, " "), value: cat });
        }
    });

    // Product match
    allProducts.forEach(p => {
        if (p.name.toLowerCase().includes(q)) {
        results.push({ type: "product", label: p.name, value: `${p.category}|${p.id}` });
        }
    });

    // No result
    if (results.length === 0) {
        box.innerHTML = `<div class="suggestion-item">No results found</div>`;
        box.style.display = "block";
        return;
    }

    // Create suggestion list
    box.innerHTML = results.map(r => `
        <div class="suggestion-item" data-type="${r.type}" data-value="${r.value}">
        🔍 ${r.label}
        </div>
    `).join("");

    box.style.display = "block";
    });

    // Handle click on suggestion
    document.getElementById("suggestionBox").addEventListener("click", function (e) {
    if (!e.target.classList.contains("suggestion-item")) return;

    let type = e.target.getAttribute("data-type");
    let val = e.target.getAttribute("data-value");

    if (type === "category") {
        window.location.href = `category.html?cat=${val}`;
    } else if (type === "product") {
        let [cat, id] = val.split("|");
        window.location.href = `category.html?cat=${cat}&id=${id}`;
    }
    });

    // ================================
    // 🌿 DYNAMIC NAVBAR (Categories + Products)
    // ================================

    const NAV_API = "http://127.0.0.1:5000/products";
    const navContainer = document.getElementById("navDynamic");

    // RUN automatically
    loadNavbar();

    async function loadNavbar() {
        try {
            const res = await fetch(NAV_API);
            const data = await res.json();

            let html = "";

            Object.keys(data).forEach(cat => {
                const catName = cat.replace(/-/g, " ").toUpperCase();
                const products = data[cat] || [];

                // Only first 10 items
                const limited = products.slice(0, 10);

                html += `
                <li class="tree-item">
                    <div class="tree-title" style="cursor:pointer;">
                        ${catName}
                        <span class="arrow-icon">▶</span>
                    </div>

                    <ul class="tree-sub">
                        ${limited.map(p => `
                            <li>
                                <a href="category.html?cat=${cat}&id=${p.id}">
                                    ${p.name}
                                </a>
                            </li>
                        `).join("")}

                        <li>
                            <a href="category.html?cat=${cat}" 
                            style="background:#0eae5e;color:#fff;border-radius:8px;">
                            ➜ View All
                            </a>
                        </li>
                    </ul>
                </li>
                `;
            });

            navContainer.innerHTML = html;

        } catch (e) {
            console.error("Navbar loading failed", e);
        }
    }

    // Global Search (when pressing Enter or Search button)
    function doSearch() {
    let q = document.getElementById("searchInput").value.trim().toLowerCase();
    if (!q) return;

    // Same logic as suggestion
    let cat = allCategories.find(c => c.toLowerCase().includes(q));
    if (cat) {
        window.location.href = `category.html?cat=${cat}`;
        return;
    }

    let p = allProducts.find(p => p.name.toLowerCase().includes(q));
    if (p) {
        window.location.href = `category.html?cat=${p.category}&id=${p.id}`;
        return;
    }

    alert("No match found");
    }

    // ENTER key search
    document.getElementById("searchInput").addEventListener("keypress", e => {
    if (e.key === "Enter") doSearch();
    });


    // ============================================
    // HERO SLIDER
    // ============================================
    
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.slider-dots .dot');
    let currentSlide = 0;
    let sliderInterval;

    function showSlide(index) {
        if (slides.length === 0) return;
        
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        
        currentSlide = (index + slides.length) % slides.length;
        
        slides[currentSlide].classList.add('active');
        if (dots[currentSlide]) {
        dots[currentSlide].classList.add('active');
        }
    }

    function nextSlide() {
        showSlide(currentSlide + 1);
    }

    function startSlider() {
        if (slides.length > 0) {
        sliderInterval = setInterval(nextSlide, 5000);
        }
    }

    function stopSlider() {
        clearInterval(sliderInterval);
    }

    // Initialize slider
    if (slides.length > 0) {
        showSlide(0);
        startSlider();

        // Dot navigation
        dots.forEach(function(dot, index) {
        dot.addEventListener('click', function() {
            stopSlider();
            showSlide(index);
            startSlider();
        });
        });

        // Pause on hover
        const heroSection = document.querySelector('.hero-slider-section');
        if (heroSection) {
        heroSection.addEventListener('mouseenter', stopSlider);
        heroSection.addEventListener('mouseleave', startSlider);
        }
    }

    // ============================================
    // PRODUCT TREE CLICK
    // ============================================

    document.querySelectorAll('.tree-title').forEach(title => {
    title.addEventListener('click', function() {
        const link = this.getAttribute('data-link');
        if (link) {
        window.location.href = link;
        }
    });
    });

    // 🌿 Handle smooth scroll after page load with hash link
    document.addEventListener("DOMContentLoaded", function () {
    const hash = window.location.hash;
    if (hash) {
        // Thoda delay taki DOM ready ho jaye
        setTimeout(() => {
        const target = document.querySelector(hash);
        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        }, 500);
    }
    });

    // Read More toggle for herbal sections
    document.addEventListener("DOMContentLoaded", function() {
    const readBtns = document.querySelectorAll(".read-more-btn");
    readBtns.forEach(btn => {
        btn.addEventListener("click", () => {
        const para = btn.previousElementSibling; // p tag
        para.classList.toggle("expanded");

        if (para.classList.contains("expanded")) {
            btn.textContent = "Read Less";
        } else {
            btn.textContent = "Read More";
        }
        });
    });
    });

    // when we click on arrow on mobile size open dropdown 
    document.addEventListener("DOMContentLoaded", function () {
    // For every tree item
    document.querySelectorAll(".tree-item").forEach(item => {
        const title = item.querySelector(".tree-title");
        const arrow = item.querySelector(".arrow-icon");

        // 🟢 When text (not arrow) clicked → Go to page
        title.addEventListener("click", function (e) {
        if (window.innerWidth <= 820 && !e.target.classList.contains("arrow-icon")) {
            const link = title.dataset.link;
            if (link) {
            window.location.href = link; // open that section on product page
            }
        }
        });

        // 🟢 When arrow clicked → Toggle dropdown
        if (arrow) {
        arrow.addEventListener("click", function (e) {
            e.stopPropagation();
            e.preventDefault();
            item.classList.toggle("active");
        });
        }
    });
    });


    // Get button
    const backToTopBtn = document.getElementById("backToTopBtn");

    window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
        backToTopBtn.classList.add("show");
    } else {
        backToTopBtn.classList.remove("show");
    }
    });

    backToTopBtn.addEventListener("click", () => {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
    });




    // ============================================
    // PRODUCT GALLERY DOTS
    // ============================================
    
    const galleryTrack = document.getElementById('galleryTrack');
    const gDotsContainer = document.getElementById('gDots');

    if (galleryTrack && gDotsContainer) {
        const gCards = galleryTrack.querySelectorAll('.g-card');
        const isMobile = window.innerWidth <= 768;
        const cardsPerView = isMobile ? 1 : 3;
        const totalDots = Math.ceil(gCards.length / cardsPerView);

        // Create dots
        for (let i = 0; i < totalDots; i++) {
        const dot = document.createElement('span');
        dot.className = 'g-dot';
        if (i === 0) dot.classList.add('active');
        
        dot.addEventListener('click', function() {
            const cardWidth = gCards[0].offsetWidth + 24;
            galleryTrack.scrollTo({
            left: i * cardWidth * cardsPerView,
            behavior: 'smooth'
            });
        });
        
        gDotsContainer.appendChild(dot);
        }

        // Update active dot on scroll
        let scrollTimer;
        galleryTrack.addEventListener('scroll', function() {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(function() {
            const cardWidth = gCards[0].offsetWidth + 24;
            const scrollPos = galleryTrack.scrollLeft;
            const activeIndex = Math.round(scrollPos / (cardWidth * cardsPerView));
            
            const allDots = gDotsContainer.querySelectorAll('.g-dot');
            allDots.forEach(function(dot, index) {
            dot.classList.toggle('active', index === activeIndex);
            });
        }, 100);
        });
    }

    // ============================================
    // ANIMATED COUNTERS
    // ============================================
    
    const counters = document.querySelectorAll('.counter');
    let hasAnimated = false;

    function animateCounters() {
        if (hasAnimated) return;
        hasAnimated = true;

        counters.forEach(function(counter) {
        const target = parseInt(counter.getAttribute('data-target'));
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;

        function updateCounter() {
            current += step;
            if (current < target) {
            counter.textContent = Math.floor(current);
            requestAnimationFrame(updateCounter);
            } else {
            counter.textContent = target;
            }
        }

        updateCounter();
        });
    }

    // Observe stats section
    const statsSection = document.querySelector('.animated-stats');
    if (statsSection && counters.length > 0) {
        const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
            animateCounters();
            }
        });
        }, { threshold: 0.5 });

        observer.observe(statsSection);
    }

    // ============================================
    // FADE-UP ANIMATIONS
    // ============================================
    
    const fadeElements = document.querySelectorAll('.fade-up');

    if (fadeElements.length > 0) {
        const fadeObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            }
        });
        }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
        });

        fadeElements.forEach(function(el) {
        fadeObserver.observe(el);
        });
    }

    // ============================================
    // SMOOTH SCROLL
    // ============================================
    
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href && href !== '#' && href.length > 1) {
            const target = document.querySelector(href);
            if (target) {
            e.preventDefault();
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            
            // Close mobile menu
            if (siteHeader && siteHeader.classList.contains('open')) {
                siteHeader.classList.remove('open');
                body.style.overflow = '';
            }
            }
        }
        });
    });

    // ============================================
    // PAGE LOADED
    // ============================================
    
    window.addEventListener('load', function() {
        document.body.classList.add('loaded');
        console.log('✅ Pukhraj Herbal loaded successfully!');
    });
})();