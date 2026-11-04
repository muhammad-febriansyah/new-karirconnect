"""KarirConnect crawler worker.

Laravel starts this package as a short-lived process (``python -m
karir_crawler.cli``), writes one JSON request to stdin and reads one JSON
response from stdout. The worker only fetches and extracts; Laravel owns
validation against master data and all persistence.
"""
