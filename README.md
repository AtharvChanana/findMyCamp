# YelpCamp

A modern camping review website built with Node.js, Express, MongoDB, and Bootstrap. This application allows users to explore and review campgrounds across various locations.

## Features

- Browse and search campgrounds
- View detailed campground information
- Add new campgrounds
- Leave reviews and ratings
- Responsive design for all devices

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.0 or higher)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/yelpcamp.git
   cd yelpcamp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start MongoDB:
   ```bash
   # For macOS with Homebrew
   brew services start mongodb-community
   ```

4. Start the application:
   ```bash
   node app.js
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Project Structure

```
yelpcamp/
├── models/              # Database models
│   └── campground.js   # Campground schema
├── public/             # Static files
│   └── stylesheets/    # CSS files
├── routes/             # Route handlers
├── views/              # EJS templates
│   ├── campgrounds/   # Campground views
│   ├── layouts/       # Layout templates
│   └── partials/      # Shared components
├── utils/              # Utility functions
├── app.js              # Main application file
└── package.json        # Project dependencies
```

## Technologies Used

- Backend: Node.js, Express.js
- Database: MongoDB
- Frontend: Bootstrap 5, EJS
- Additional: Font Awesome, Joi for validation

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

ISC License
