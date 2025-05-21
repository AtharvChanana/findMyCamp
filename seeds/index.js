const mongoose = require('mongoose')
const cities = require('./cities')
const Campground = require('../models/campground')
const {places,descriptors} = require('./seedHelpers')

main().catch(err => console.log(err));

async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/yelp-camp');
    console.log('MONGO CONNECTION OPEN')
}

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
seedDB().then(()=>{
    mongoose.connection.close()
})