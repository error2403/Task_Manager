const weekdays = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const today = new Date();

const options = { 
    year: 'numeric', 
    month: 'numeric', 
    day: 'numeric' 
};

const formattedDate = today.toLocaleDateString('en-US', options);

document.getElementById('weekday').textContent = weekdays[today.getDay()];
document.getElementById('date').textContent = formattedDate;