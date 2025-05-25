# findMyCamp

A modern camping review website built with Node.js, Express, MongoDB, and Bootstrap. This application allows users to explore and review campgrounds across various locations.

## Features

- Browse and search campgrounds
- View detailed campground information
- Add new campgrounds
- Leave reviews and ratings
- Responsive design for all devices

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.0 or higher) or a MongoDB Atlas account
- Git
- A Render.com account (for deployment)

## Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/yelpcamp.git
   cd yelpcamp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your environment variables:
   ```
   MONGODB_URI=mongodb://localhost:27017/yelp-camp
   SESSION_SECRET=your_session_secret_here
   PORT=3000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Render

1. Push your code to a GitHub repository.

2. Sign up for a free account at [Render](https://render.com/) if you haven't already.

3. Click on the "New +" button and select "Web Service".

4. Connect your GitHub repository to Render.

5. In the deployment settings:
   - **Name**: yelpcamp (or your preferred name)
   - **Region**: Choose the one closest to you
   - **Branch**: main (or your main branch)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Auto-Deploy**: Yes

6. Click on "Advanced" and add the following environment variables:
   - `NODE_ENV`: production
   - `MONGODB_URI`: Your MongoDB connection string (for production)
   - `SESSION_SECRET`: A strong secret for session encryption

7. Click "Create Web Service" to deploy your application.

8. Render will automatically build and deploy your application. Once deployed, you'll get a URL like `https://your-app-name.onrender.com`.

## Using MongoDB Atlas (Recommended for Production)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free account.
2. Create a new project and a free shared cluster.
3. In the Security tab, add a new database user with read/write access.
4. In the Network Access tab, add your IP address (or 0.0.0.0/0 for all IPs, but this is less secure).
5. Click "Connect" on your cluster, then "Connect your application".
6. Copy the connection string and replace the placeholders with your database username and password.
7. Use this connection string as your `MONGODB_URI` in the Render environment variables.

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
