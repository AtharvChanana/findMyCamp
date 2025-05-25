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

    // Favorite button functionality
    document.querySelectorAll('.favorite-form').forEach(form => {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const button = this.querySelector('.favorite-btn');
            const icon = button.querySelector('i');
            const isSaved = icon.classList.contains('fas');
            const url = isSaved 
                ? `/campgrounds/${button.dataset.campgroundId}/unsave`
                : `/campgrounds/${button.dataset.campgroundId}/save`;
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                
                if (response.ok) {
                    // Toggle the heart icon
                    icon.classList.toggle('far');
                    icon.classList.toggle('fas');
                    
                    // Update tooltip text
                    const newTitle = isSaved ? 'Add to favorites' : 'Remove from favorites';
                    const tooltip = bootstrap.Tooltip.getInstance(button);
                    if (tooltip) {
                        button.setAttribute('title', newTitle);
                        tooltip.setContent({ '.tooltip-inner': newTitle });
                    }
                } else {
                    throw new Error('Failed to update favorite status');
                }
            } catch (error) {
                console.error('Error:', error);
                // Show error message to user
                const toast = new bootstrap.Toast(document.getElementById('errorToast'));
                const toastBody = document.querySelector('#errorToast .toast-body');
                toastBody.textContent = 'Failed to update favorite status. Please try again.';
                toast.show();
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
