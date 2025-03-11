const { clearStore } = require('./dbService');

async function run() {
    try {
        await clearStore();
        console.log("IndexedDB cleared successfully.");
    } catch (error) {
        console.error("Error clearing IndexedDB:", error);
    }
}

run();
