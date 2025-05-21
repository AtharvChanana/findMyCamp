// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Save button functionality
    document.querySelectorAll('.btn-save').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const campgroundId = this.dataset.campgroundId;
            const isSaved = this.classList.contains('active');
            
            // Toggle active state
            this.classList.toggle('active');
            
            // Update icon and text
            const icon = this.querySelector('i');
            const text = this.querySelector('.btn-text');
            
            if (isSaved) {
                icon.classList.remove('fas');
                icon.classList.add('far');
                text.textContent = ' Save';
                // Here you would typically make an API call to unsave
                console.log('Unsaved campground', campgroundId);
            } else {
                icon.classList.remove('far');
                icon.classList.add('fas');
                text.textContent = ' Saved';
                // Here you would typically make an API call to save
                console.log('Saved campground', campgroundId);
            }
        });
    });

    // Share button functionality
    document.querySelectorAll('.btn-share').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const url = window.location.href;
            
            if (navigator.share) {
                navigator.share({
                    title: document.title,
                    url: url
                }).catch(console.error);
            } else {
                // Fallback for browsers that don't support Web Share API
                navigator.clipboard.writeText(url).then(() => {
                    const tooltip = new bootstrap.Tooltip(this, {
                        title: 'Link copied to clipboard!',
                        trigger: 'manual'
                    });
                    tooltip.show();
                    setTimeout(() => tooltip.hide(), 2000);
                });
            }
        });
    });

    // Review form submission
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(this);
            const review = Object.fromEntries(formData.entries());
            
            // Here you would typically make an API call to submit the review
            console.log('Submitting review:', review);
            
            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addReviewModal'));
            modal.hide();
            
            // Show success message
            alert('Thank you for your review!');
        });
    }

    // Booking form submission
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(this);
            const booking = Object.fromEntries(formData.entries());
            
            // Here you would typically make an API call to book the campground
            console.log('Creating booking:', booking);
            
            // Show success message
            alert('Your booking has been confirmed!');
        });
    }

    // Contact host button
    document.querySelectorAll('.btn-contact-host').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const hostId = this.dataset.hostId;
            // Here you would typically open a chat or contact form
            console.log('Contacting host:', hostId);
            alert('Contact form would open here.');
        });
    });

    // Image gallery functionality
    const galleryImages = document.querySelectorAll('.gallery-thumbnail');
    const mainImage = document.querySelector('.main-gallery-image');
    
    if (galleryImages.length && mainImage) {
        galleryImages.forEach(img => {
            img.addEventListener('click', function() {
                // Update main image
                mainImage.src = this.src;
                // Update active thumbnail
                document.querySelector('.gallery-thumbnail.active')?.classList.remove('active');
                this.classList.add('active');
            });
        });
    }

    // View all photos button
    const viewAllPhotosBtn = document.getElementById('viewAllPhotos');
    if (viewAllPhotosBtn) {
        viewAllPhotosBtn.addEventListener('click', function() {
            // Here you would typically open a lightbox or modal with all photos
            console.log('Opening photo gallery');
            // For now, just log to console
        });
    }
});

// Function to handle star ratings
function setRating(rating, inputId) {
    const stars = document.querySelectorAll(`#${inputId} ~ .star-rating .star`);
    const hiddenInput = document.getElementById(inputId);
    
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('text-warning');
            star.classList.remove('text-muted');
        } else {
            star.classList.remove('text-warning');
            star.classList.add('text-muted');
        }
    });
    
    if (hiddenInput) {
        hiddenInput.value = rating;
    }
}
