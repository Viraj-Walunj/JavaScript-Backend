// Defines a custom class 'ApiResponse' to standardize successful responses across your entire API
class ApiResponse {
    // The constructor method initializes new object instances with these 3 parameters
    constructor(
        statusCode,           // The HTTP status code indicating success (typically 200, 201, etc.)
        data,                 // The payload or data being sent back to the client (objects, arrays, strings)
        message = "Success"   // A user-friendly response message (defaults to "Success" if empty)
    ){
        // Stores the HTTP status code directly on the instance for tracking and logging
        this.statusCode = statusCode
        
        // Assigns the main payload or data to the instance so the client can read the requested information
        this.data = data
        
        // Assigns the descriptive text message to the instance
        this.message = message
        
        // Automatically evaluates to true if the status code is below 400 (all 2xx and 3xx codes are successful)
        this.success = statusCode < 400
    }
}

// Exports the class so you can reuse this format in your controller files
export { ApiResponse }
