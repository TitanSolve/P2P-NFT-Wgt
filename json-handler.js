// Function to save JSON data
async function saveJson(data) {
    try {
        const response = await fetch('https://jsonstorage.net/api/items', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Data saved successfully. URL:', result.uri);
        return result.uri;
    } catch (error) {
        console.error('Error saving data:', error);
        throw error;
    }
}

// Function to get JSON data
async function getJson(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Retrieved data:', data);
        return data;
    } catch (error) {
        console.error('Error getting data:', error);
        throw error;
    }
}

// Example usage
async function handleData() {
    try {
        // Your JSON data
        const data = {
            name: 'John Doe',
            age: 30,
            city: 'New York'
        };

        // Save the data
        const url = await saveJson(data);
        console.log('Data saved at:', url);

        // Get the data
        const retrievedData = await getJson(url);
        console.log('Retrieved data:', retrievedData);

        // Update the data
        const updatedData = {
            ...retrievedData,
            age: 31,
            lastUpdated: new Date().toISOString()
        };

        // Save the updated data to the same URL
        await saveJson(updatedData);
        console.log('Data updated at:', url);

        // Get the updated data
        const finalData = await getJson(url);
        console.log('Final data:', finalData);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the example
handleData();
