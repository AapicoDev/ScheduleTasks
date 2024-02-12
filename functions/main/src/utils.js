export function getDaysDifference(startDateStr) {
    // Parse the start date string into a Date object
    const startDate = new Date(startDateStr);

    // Get the current date
    const endDate = new Date();

    // Calculate the difference in milliseconds
    const differenceInMilliseconds = endDate - startDate;

    // Convert milliseconds to days
    const differenceInDays = differenceInMilliseconds / (1000 * 60 * 60 * 24);

    return Math.floor(differenceInDays); // Round down to the nearest whole number
}