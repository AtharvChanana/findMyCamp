const mongoose = require('mongoose');
const cities = require('./cities');
const Campground = require('../models/campground');
const { connectDB, closeConnection } = require('../config/database');
const { places, descriptors } = require('./seedHelpers');

// Set up MongoDB connection
const init = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        process.exit(1);
    }
};

const sample = array => array[Math.floor(Math.random() * array.length)]
const seedDB = async ()=>{
    await Campground.deleteMany({})
    for (let i =0; i<50; i++){
        const random1000 = Math.floor(Math.random() * 1000) +1
        const price = Math.floor(Math.random() * 20)+10
        const camp = new Campground({
            location:`${cities[random1000].city}, ${cities[random1000].state}`,
            title:`${sample(places)} ${sample(descriptors)}`,
            image: `https://picsum.photos/400?random=${Math.random()}`,
            description: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Maiores corporis error facilis illum est quam recusandae quod placeat ducimus in, adipisci, quidem dolore quos? Necessitatibus molestias possimus asperiores esse placeat!',
            price:price
        })
        await camp.save()
    }
}
// Seed the database and close the connection when done
const runSeeds = async () => {
    try {
        await init();
        await seedDB();
        console.log('Database seeded successfully!');
    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        await closeConnection();
        process.exit(0);
    }
};

runSeeds();