from functools import wraps
from flask_socketio import emit, disconnect
import logging
from flask import jsonify

def exception_handler(event_name='error'):
    """
    Decorator to handle exceptions in Flask-SocketIO events.
    Emits an error message to the client and disconnects if an exception occurs.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except KeyError as e:
                error_message = f"Missing required field: {e}"
                logging.error(f"KeyError in {func.__name__}: {error_message}")
                emit(event_name, {'message': error_message})
                disconnect()
            except Exception as e:
                error_message = f"An error occurred: {str(e)}"
                logging.error(f"Exception in {func.__name__}: {error_message}")
                emit(event_name, {'message': error_message})
                disconnect()
        return wrapper
    return decorator

def post_exception_handler(func):
    """
    Decorator to handle exceptions in Flask route functions.
    Returns a JSON response with an error code if an exception occurs.
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except KeyError as e:
            error_message = f"Missing required field: {e}"
            return jsonify({"error": error_message}), 400
        except Exception as e:
            error_message = f"An error occurred: {str(e)}"
            return jsonify({"error": error_message}), 500
    return wrapper