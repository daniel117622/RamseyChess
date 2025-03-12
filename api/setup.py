from setuptools import setup, find_packages

setup(
    name="evaluate_material_mock_data",
    version="0.1",
    author="Your Name",
    author_email="your_email@example.com",
    description="A brief description of your package",
    packages=find_packages(include=["data_access", "data_access.*", "evaluators", "evaluators.*"]),
    install_requires=[
        "dataclasses; python_version<'3.7'",
        "pymongo",
        "flask",
        'flask-cors',
        "chess",
        "flasgger",
        "eventlet"
    ],
    python_requires='>=3.6',
)
