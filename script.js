// AntiTarheel Website JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Mobile Navigation Toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            // Toggle between hamburger and X icon
            const icon = menuToggle.querySelector('i');
            if (icon.classList.contains('fa-bars')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }
    
    // Dropdown menu for mobile view
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    
    if (window.innerWidth <= 768) {
        dropdownToggles.forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                // Only activate dropdown toggle in mobile view
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    const dropdownMenu = this.nextElementSibling;
                    dropdownMenu.classList.toggle('active');
                }
            });
        });
    }
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('nav') && navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            const icon = menuToggle.querySelector('i');
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Close mobile menu if open
                if (navMenu.classList.contains('active')) {
                    navMenu.classList.remove('active');
                    const icon = menuToggle.querySelector('i');
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
                
                // Scroll to target
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Add active class to nav links based on current page
    const currentLocation = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-menu a');
    
    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        if (currentLocation.includes(linkPath) && linkPath !== 'index.html') {
            link.classList.add('active');
        } else if (currentLocation.endsWith('/') && linkPath === 'index.html') {
            link.classList.add('active');
        } else if (currentLocation.endsWith('index.html') && linkPath === 'index.html') {
            link.classList.add('active');
        }
    });
    
    // Animate content cards on scroll
    const animateOnScroll = function() {
        const cards = document.querySelectorAll('.content-card');
        
        cards.forEach(card => {
            const cardPosition = card.getBoundingClientRect().top;
            const screenPosition = window.innerHeight / 1.3;
            
            if (cardPosition < screenPosition) {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }
        });
    };
    
    // Set initial state for content cards
    const cards = document.querySelectorAll('.content-card');
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.5s ease';
    });
    
    // Run animation on scroll
    window.addEventListener('scroll', animateOnScroll);
    // Run once on page load
    animateOnScroll();
    
    // Form validation for contact form
    const contactForm = document.getElementById('contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form fields
            const nameInput = document.getElementById('name');
            const emailInput = document.getElementById('email');
            const messageInput = document.getElementById('message');
            const formStatus = document.getElementById('form-status');
            
            // Simple validation
            let isValid = true;
            
            if (!nameInput.value.trim()) {
                markInvalid(nameInput, 'Name is required');
                isValid = false;
            } else {
                markValid(nameInput);
            }
            
            if (!emailInput.value.trim()) {
                markInvalid(emailInput, 'Email is required');
                isValid = false;
            } else if (!isValidEmail(emailInput.value)) {
                markInvalid(emailInput, 'Please enter a valid email');
                isValid = false;
            } else {
                markValid(emailInput);
            }
            
            if (!messageInput.value.trim()) {
                markInvalid(messageInput, 'Message is required');
                isValid = false;
            } else {
                markValid(messageInput);
            }
            
            // If form is valid, submit it
            if (isValid) {
                // Here you would normally send the form data to a server
                // For now, we'll just show a success message
                formStatus.textContent = 'Message sent successfully!';
                formStatus.className = 'success-message';
                contactForm.reset();
                
                // Clear success message immediately
                formStatus.textContent = '';
                formStatus.className = '';
            }
        });
        
        // Helper functions for form validation
        function markInvalid(input, message) {
            input.classList.add('invalid');
            const errorElement = input.nextElementSibling;
            if (errorElement && errorElement.classList.contains('error-message')) {
                errorElement.textContent = message;
            } else {
                const error = document.createElement('div');
                error.className = 'error-message';
                error.textContent = message;
                input.parentNode.insertBefore(error, input.nextSibling);
            }
        }
        
        function markValid(input) {
            input.classList.remove('invalid');
            const errorElement = input.nextElementSibling;
            if (errorElement && errorElement.classList.contains('error-message')) {
                errorElement.textContent = '';
            }
        }
        
        function isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }
        
        // Clear validation on input
        const formInputs = contactForm.querySelectorAll('input, textarea');
        formInputs.forEach(input => {
            input.addEventListener('input', function() {
                this.classList.remove('invalid');
                const errorElement = this.nextElementSibling;
                if (errorElement && errorElement.classList.contains('error-message')) {
                    errorElement.textContent = '';
                }
            });
        });
    }
}); 