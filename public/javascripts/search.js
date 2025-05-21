document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');

    // Clear search input
    if (clearSearch) {
        clearSearch.addEventListener('click', function() {
            searchInput.value = '';
            searchInput.focus();
            // Submit the form when clearing to show all results
            searchForm.submit();
        });
    }


    // Add animation to search input on focus
    if (searchInput) {
        searchInput.addEventListener('focus', function() {
            searchForm.classList.add('search-focused');
        });

        searchInput.addEventListener('blur', function() {
            searchForm.classList.remove('search-focused');
        });
    }

});
