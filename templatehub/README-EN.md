# Plan
## Completed
### Backend
- Modify the persistence framework to JPA`
- Replace the utility class with the community utility class: Replace the 'Message' return class and modify the backend request return format
- Template upload interface: Upload the first version of a template series
- Version upload interface: Upload subsequent versions of a template series
- Template search interface: Based on user query templates and querying all templates
- Abstract file upload interface: complete the implementation class adaptation of MinIO, configurable storage system
- Template download interface: provides a permanent download address, maps the address, and hides the MinIO address from the user
- Sharing interface: Generate a download URL for a certain version for sharing based on Base62 encoding`
- Sharing and downloading interface: Download files by accessing the sharing link in the browser
### Front end
- All template query function
- Template upload function
- Download function for a certain template and version file


## Todo
- Organize the design framework
### Backend
- Like or favorite statistics function:
- Add likes or favorites statistics in the 'template' and 'version' tables
- Users can like and bookmark after logging in
- Template image function: The system automatically assigns images based on categories or generates random images similar to 'GitHub'
- Category and tag management function
- Template deletion and removal function
- Backend management function
- Login and registration function
### Front end
- Template information display
- Implementation of version query function
- Sharing Function Implementation
- Implementation of version upload function

## 🛡️ License
[`Apache License, Version 2.0`](https://www.apache.org/licenses/LICENSE-2.0.html)
