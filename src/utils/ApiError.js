// Defines a custom class 'ApiError' that extends (inherits from) the built-in JavaScript 'Error' class
class ApiError extends Error {
    // The constructor method initializes new object instances with these 4 parameters
    constructor(
        statusCode,                           // The HTTP status code (e.g., 400, 404, 500)
        message = "Someting went wrong",      // The error description (defaults to "Someting went wrong" if empty)
        errors = [],                          // An array to store multiple specific errors (defaults to an empty array)
        stack = ""                            // A custom error stack trace string (defaults to an empty string)
    ){
        // Calls the parent 'Error' class constructor and passes the message to set the standard error message
        super(message)
        
        // Stores the HTTP status code directly on the error instance for easy access in your middleware
        this.statusCode = statusCode
        
        // Explicitly sets a 'data' field to null (useful if you want to keep the structure uniform with ApiResponse)
        this.data = null
        
        // Overrides or explicitly sets the error message property on this instance
        this.message = message
        
        // Always sets 'success' to false, because this class is specifically used to handle API failures
        this.success = false;
        
        // Assigns the detailed array of errors (like validation fields) to the instance
        this.errors = errors

        // Checks if a custom error stack trace string was passed into the constructor
        if(stack){
            // If provided, manually assign the passed-in stack trace to this instance
            this.stack = stack
        }
        // Runs if no custom stack trace was provided (the usual case)
        else{
            // Generates a clean, standard V8 engine stack trace pointing to where this exact error was created
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

// Exports the class so it can be imported in other files (Note: If your class name is 'ApiError', change 'Api' to 'ApiError')
export { ApiError }
