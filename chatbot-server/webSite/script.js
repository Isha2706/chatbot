document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const targetId = this.getAttribute('data-page');
            document.querySelectorAll('main section').forEach(section => {
                section.classList.add('hidden');
            });
            // Update Dashboard with Dynamic Data
            if (targetId === 'dashboard') {
                document.getElementById('goal').innerText = 'Active learning progress';
            }
            document.getElementById(targetId).classList.remove('hidden');
        });
    });
    document.getElementById('contact-form').addEventListener('submit', function(event) {
        event.preventDefault();
        alert('Your message has been sent!');
        this.reset();
    });
})