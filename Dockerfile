# Use the official MongoDB image as the base
FROM mongo:5.0

# Set the port that MongoDB will run on
EXPOSE 27017

# Set up the command to run MongoDB with custom options
CMD ["mongod", "--bind_ip", "0.0.0.0", "--port", "27017"]
