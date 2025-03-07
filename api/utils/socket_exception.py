from functools import wraps
from flask_socketio import emit, disconnect
import logging

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

def post_exception_handler():
    """
    Decorator to handle exceptions and return a JSON response with error code and message.
    Does not use emit; it directly returns a JSON response.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except KeyError as e:
                error_message = f"Missing required field: {e}"
                logging.error(f"KeyError in {func.__name__}: {error_message}")
                return jsonify({'error': error_message, 'code': 400}), 400
            except Exception as e:
                error_message = f"An error occurred: {str(e)}"
                logging.error(f"Exception in {func.__name__}: {error_message}")
                return jsonify({'error': error_message, 'code': 500}), 500
        return wrapper
    return decorator