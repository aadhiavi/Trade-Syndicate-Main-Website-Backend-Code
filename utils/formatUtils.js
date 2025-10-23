const formatDate = (dateString) => {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
};

const calculateCost = (count, baseFare, quantity = 8, extraHours = 0) => {
    if (quantity <= 0) return 0;
    const perHourRate = baseFare / quantity;
    const totalHours = quantity + extraHours;
    const costPerPerson = perHourRate * totalHours;
    return costPerPerson * count;
};

const calculateBaseFare = (cost, count, quantity = 8, extraHours = 0) => {
    const totalHours = quantity + extraHours;
    const totalManHours = count * totalHours;
    const perHourRate = totalManHours > 0 ? cost / totalManHours : 0;
    return perHourRate * quantity;
};

module.exports = { formatDate, calculateCost, calculateBaseFare };