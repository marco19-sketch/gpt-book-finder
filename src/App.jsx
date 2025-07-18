import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Modal from "./components/Modal";
import CustomRadio from "./components/CustomRadio";
import "./App.css";
import LanguageSwitcher from "./components/LanguageSwitcher";
import BookCard from "./components/BookCard";
import { FaArrowUp } from "react-icons/fa";
import BackToTop from "./components/BackToTop";

// import useLiveAnnouncement from './hooks/useLiveAnnouncement'; // not working?

const languageMap = {
  en: "English",
  fr: "French",
  it: "Italian",
  es: "Spanish",
  de: "German",
  pt: "Portuguese",
  ru: "Russian",
  zh: "Chinese",
  ja: "Japanese",
  ar: "Arabic",
  nl: "Dutch",
  sv: "Swedish",
  hi: "Hindi",
};

const labelsMap = {
  intitle: "Title",
  inauthor: "Author",
  subject: "Subject",
};

function App() {
  const [bookList, setBookList] = useState([]);
  const [selectedTitle, setSelectedTitle] = useState(null);
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [noDetailsFound, setNoDetailsFound] = useState(false);
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState("title");
  const [hasSearched, setHasSearched] = useState(false);
  const [showNoResultsModal, setShowNoResultsModal] = useState(false); //for accessibility, it makes the screen reader read the 'No results found'
  const [amazonItLink, setAmazonItLink] = useState("");
  const [startIndex, setStartIndex] = useState(0);
  const [maxResult] = useState(10);
  const [view, setView] = useState('home');
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("favorites");
    return saved ? JSON.parse(saved) : [];
  });

  const toggleFavorite = book => {
    setFavorites(prev => {
      const exist = prev.find(b => b.id === book.id);
      let updated;
      if (exist) {
        updated = prev.filter(b => b.id !== book.id);
      } else {
        updated = [...prev, book];
      }
      localStorage.setItem("favorites", JSON.stringify(updated));
      return updated;
    });
  };

  const handleInputChange = useCallback(e => setQuery(e.target.value), []);

  const { t } = useTranslation();

  useEffect(() => {
    setQuery("");
    setHasSearched(false);
  }, [searchMode]);

  const handleFetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${searchMode}:${query}&startIndex=${startIndex}&maxResults=${maxResult}`
      );
      if (!res.ok) {
        alert("Your search produced no results, try again");
        return;
      }
      const data = await res.json();

      // If startIndex is 0, it's a new search → reset the list
      if (startIndex === 0) {
        setBookList(data.items || []);
        // setHasSearched(true);
      } else {
        setBookList(prev => [...prev, ...(data.items || [])]);
      }

      setLoading(false);

      // setHasSearched(true);
      // console.log("book list", data.items);
    } catch (error) {
      console.error("Impossible to fetch data:", error);
    }
  }, [query, searchMode, maxResult, startIndex]);

  const handleSelected = useCallback(book => {
    setShowModal(true);
    setSelectedTitle(book);
  }, []);

  //prevent duplicate book ids, Set() keeps tracks of all the item already passed through the filter. So just one loop, very efficient.
  const uniqueBooks = useMemo(() => {
    const seen = new Set();
    return bookList.filter(book => {
      if (seen.has(book.id)) return false;
      seen.add(book.id);
      return true;
    });
  }, [bookList]);

  useEffect(() => {
    if (hasSearched) {
      handleFetch();
      console.log("hasSearched", hasSearched);
    }
  }, [startIndex, handleFetch, hasSearched]);

  const handleFetchNew = () => {
    setStartIndex(0);
    setHasSearched(true);
    handleFetch();
  };

  //Amazon Link building
  useEffect(() => {
    if (!selectedTitle) {
      setAmazonItLink("");
      return;
    }

    const identifiers = selectedTitle.volumeInfo?.industryIdentifiers || [];

    const isbn13 =
      identifiers.find(id => id.type === "ISBN_13")?.identifier || "";
    const isbn10 =
      identifiers.find(id => id.type === "ISBN_10")?.identifier || "";

    const isbn = isbn13 || isbn10;
    if (isbn) {
      setAmazonItLink(`https://www.amazon.it/s?k=${isbn}`);
      console.log("ISBN_13", isbn);
    } else {
      setAmazonItLink("");
    }
  }, [selectedTitle]);
  console.log("amazon it link", amazonItLink);

  const handleReset = useCallback(() => {
    setBookList([]);
    setSelectedTitle(null);
    setQuery("");
    setSearchMode("title");
    setHasSearched(false);
    setShowNoResultsModal(false);
    setLoading(false);
    setAmazonItLink("");
  }, []);

  return (
    <div className="root">
      <a href="#main-content" className="skip-link">
        {t("skipToMain")}
      </a>
      <LanguageSwitcher />
      <header role="banner">
        <h1>{t("title")}</h1>
      </header>
      <button
        className="favorites-btn"
        onClick={() => setView(view === "home" ? "favorites" : "home")}>
        {view === "home"
          ? `See Favorites (${favorites.length})`
          : "Back to Search"}
      </button>

      {noDetailsFound && (
        <Modal onClose={() => setNoDetailsFound(false)}>
          <p className="no-detail-found">{t("noDetailsFound")}</p>
        </Modal>
      )}
      {view === "home" && (
        <>
          <main role="main" id="main-content">
            <div className="label-container">
              {["intitle", "inauthor", "subject"].map(mode => (
                <CustomRadio
                  key={mode}
                  label={t(`searchBy${labelsMap[mode]}`)}
                  name="searchMode"
                  value={mode}
                  checked={searchMode === mode}
                  onChange={() => setSearchMode(mode)}
                />
              ))}
            </div>
            <input
              aria-label="Search for books"
              className="input-element"
              ref={inputRef}
              value={query}
              onChange={handleInputChange}
              placeholder={t("enterSearchTerm")}
            />
            <button
              className="btn-element"
              type="button"
              onClick={handleFetchNew}>
              {t("startSearch")}
            </button>
            <button className="reset-btn" type="button" onClick={handleReset}>
              {t("reset")}
            </button>
          </main>
        </>
      )}

      {view === "favorites" && (
        <div className="favorites-page">
          <h2>Your Favorites</h2>
          {favorites.length === 0 ? (
            <p>No favorites yet.</p>
          ) : (
            <div className="book-rslt-container" role="list">
              {favorites.map(book => (
                <div className="book-results" key={book.id}>
                  <BookCard
                    book={book}
                    onSelect={handleSelected}
                    languageMap={languageMap}
                    t={t}
                    isFavorite={true}
                    onToggleFavorite={() => toggleFavorite(book)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {!loading &&
        query.length > 1 &&
        hasSearched === true &&
        bookList.length === 0 &&
        showNoResultsModal && (
          <Modal
            onClose={() => {
              setHasSearched(false);
              setShowNoResultsModal(false);
            }}>
            <p className="no-results">{t("noResults")}</p>
          </Modal>
        )}
      {loading && bookList.length === 0 && (
        <p className="loading">{t("loading")}</p>
      )}

      <div className="book-rslt-container" role="list">
        {/*tab-index for accessibility */}
        {/*e.preventDefault() on space bar prevents browser default scroll action */}
        {/*e.prevent on click it's a defensive move; on Enter too */}
        {uniqueBooks.map((book, index) => (
          <div className="book-results" key={book.id}>
            <BookCard
              book={book}
              onSelect={handleSelected}
              languageMap={languageMap}
              t={t}
              isFavorite={favorites.some(f => f.id === book.id)}
              onToggleFavorite={() => toggleFavorite(book)}
            />
            {index !== uniqueBooks.length - 1 && <hr />}
          </div>
        ))}
      </div>

      {uniqueBooks.length > 0 && (
        <button
          className="load-more"
          onClick={() => setStartIndex(prev => prev + maxResult)}>
          Load More
        </button>
      )}

      {showModal && selectedTitle && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="modal">
            <h2 id="modal-title" className="header">
              {selectedTitle?.volumeInfo?.title || "No title"}{" "}
            </h2>

            {/*rel='noopener noreferrer' add security by blocking the targeted page to act on our page */}
            {selectedTitle?.saleInfo?.buyLink && (
              <a
                href={selectedTitle.saleInfo.buyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="buy-now">
                {t("buyOnGoogle")}
                {selectedTitle.saleInfo?.listPrice?.amount}{" "}
                {selectedTitle.saleInfo?.listPrice?.currencyCode}
              </a>
            )}
            {selectedTitle && amazonItLink && (
              <a href={amazonItLink} rel="noopener noreferrer" target="_blank">
                {t("seeOnAmazon")}
              </a>
            )}

            {/* {console.log("Amazon link", selectedTitle.saleInfo)} */}
            {console.log("SelectedTitle", selectedTitle)}
            <p className="full-description">
              <strong>{"fullDescription"}:</strong>
              {selectedTitle.volumeInfo?.description ||
                "No description available"}
            </p>
          </div>
        </Modal>
      )}

      <BackToTop scrollContainerSelector=".root" />
    </div>
  );
}

export default App;
