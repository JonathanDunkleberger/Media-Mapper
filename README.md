# Media Mapper

**Discover your next favorite movie, show, game, or book.**

Media Mapper is a sleek, modern web application designed to provide personalized media recommendations. By selecting a few of your favorites, our engine analyzes your taste profile and suggests new content you're likely to enjoy, all without requiring a signup.



## ✨ Key Features

- **Multi-Category Recommendations:** Get suggestions across movies, TV shows, video games, and books.
- **Intuitive Search:** A fast, image-rich search powered by TMDb, Google Books, and RAWG makes finding your favorites effortless.
- **Polished UI/UX:** A "cinematic" dark-mode interface inspired by modern streaming services provides a premium user experience.
- **Real-Time Suggestions:** An intelligent recommendation engine fetches similar and related titles from live APIs.
- **Performant Frontend:** Snappy and responsive UI with debounced search and cancelled network requests to prevent lag.
- **No Signup Required:** Jump right in, create a taste profile, and get recommendations instantly.

## 🛠️ Tech Stack

- **Backend:** Python, Flask
- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Styling:** Tailwind CSS
- **APIs:** The Movie Database (TMDb), Google Books, RAWG Video Games Database
- **Core Python Libraries:** `requests`, `python-dotenv`

## 🚀 Local Setup

To run this project locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/media-mapper.git](https://github.com/your-username/media-mapper.git)
    cd media-mapper
    ```

2.  **Set up API Keys:**
    -   Copy the example environment file: `cp .env.example .env`
    -   Open the `.env` file and add your personal API keys. You can get them here:
        -   [TMDb API](https://www.themoviedb.org/settings/api)
        -   [Google Books API](https://developers.google.com/books/docs/v1/using#APIKey)
        -   [RAWG API](https://rawg.io/apidocs)

3.  **Create and activate a Python virtual environment:**
    ```bash
    # For Windows
    python -m venv venv
    .\venv\Scripts\Activate.ps1

    # For macOS/Linux
    python3 -m venv venv
    source venv/bin/activate
    ```

4.  **Install the required packages:**
    ```bash
    pip install -r requirements.txt
    ```

5.  **Run the Flask application:**
    ```bash
    python app.py
    ```
    The application will be available at `http://127.0.0.1:5001`.

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.