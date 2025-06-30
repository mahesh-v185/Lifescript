/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { render } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { html } from 'htm/preact';
import { GoogleGenAI } from '@google/genai';
import { jsPDF } from 'jspdf';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'gemini-2.5-flash-preview-04-17';

// --- Types ---
interface Chapter {
  id: number;
  rawText: string;
  storyText: string;
  tone: string;
  date: string;
}

interface Book {
  id: number;
  title: string;
  chapters: Chapter[];
}

interface User {
  username: string;
  profilePicUrl?: string;
  books: Book[];
}

interface AuthUser {
    username: string;
    password?: string;
}


// --- Common Components ---
const Loader = () => html`
  <div class="loader-container">
    <div class="loader"></div>
    <p>Please wait...</p>
  </div>
`;

const ErrorMessage = ({ error }) => html`
  <div class="error-message">
    <p>Sorry, something went wrong:</p>
    <pre>${error}</pre>
  </div>
`;

// --- Auth Page ---
const AuthPage = ({ onLogin, onRegister }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username and password are required.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      if (isRegistering) {
        await onRegister(username, password);
      } else {
        await onLogin(username, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return html`
    <div class="container">
       <header>
        <h1>LifeScript</h1>
        <p class="tagline">Your life, one chapter at a time.</p>
      </header>
      <div class="auth-container">
        <h2>${isRegistering ? 'Create Account' : 'Welcome Back'}</h2>
        <form class="auth-form" onSubmit=${handleSubmit}>
          <div class="form-field">
            <label for="username">Username</label>
            <input id="username" type="text" value=${username} onInput=${(e) => setUsername(e.target.value)} required disabled=${isLoading}/>
          </div>
          <div class="form-field">
            <label for="password">Password</label>
            <input id="password" type="password" value=${password} onInput=${(e) => setPassword(e.target.value)} required disabled=${isLoading}/>
          </div>
          ${error && html`<p class="auth-error">${error}</p>`}
          ${isLoading && html`<${Loader} />`}
          <button type="submit" disabled=${isLoading}>
            ${isRegistering ? 'Register' : 'Login'}
          </button>
        </form>
        <div class="form-toggle">
          ${isRegistering ? 'Already have an account?' : "Don't have an account?"}
          <button onClick=${() => setIsRegistering(!isRegistering)}>
            ${isRegistering ? 'Login' : 'Register'}
          </button>
        </div>
      </div>
    </div>
  `;
};


// --- App Header ---
const AppHeader = ({ user, onNavigateProfile, onBack, title }) => html`
    <header class="app-header">
        <div class="header-left">
            ${onBack && html`<button class="back-button" onClick=${onBack}>← Back to Bookshelf</button>`}
            ${title && html`<h2 class="header-title">${title}</h2>`}
        </div>
        <div class="user-info">
            <button class="profile-button" onClick=${onNavigateProfile} aria-label="View Profile">
                <img
                    src=${user.profilePicUrl || 'https://st3.depositphotos.com/6672868/13701/v/450/depositphotos_137014128-stock-illustration-user-profile-icon.jpg'}
                    alt="Profile"
                    class="profile-pic-header"
                />
            </button>
        </div>
    </header>
`;

// --- Profile Page ---
const ProfilePage = ({ user, onSave, onBack, onLogout }) => {
    const [picUrl, setPicUrl] = useState(user.profilePicUrl || '');

    const handleSave = () => {
        onSave({ ...user, profilePicUrl: picUrl });
        onBack();
    };

    return html`
        <div class="container">
            <${AppHeader} user=${user} onBack=${onBack} title="Your Profile" />
            <main class="profile-page-container">
                <div class="profile-card">
                    <img
                        src=${picUrl || 'https://st3.depositphotos.com/6672868/13701/v/450/depositphotos_137014128-stock-illustration-user-profile-icon.jpg'}
                        alt="Profile Preview"
                        class="profile-pic-large"
                    />
                    <h2>${user.username}</h2>
                    <div class="form-field">
                        <label for="profile-pic-url">Profile Picture URL</label>
                        <input
                            id="profile-pic-url"
                            type="text"
                            value=${picUrl}
                            onInput=${e => setPicUrl(e.target.value)}
                            placeholder="https://example.com/image.png"
                        />
                    </div>
                    <div class="profile-actions">
                        <button onClick=${handleSave}>Save Changes</button>
                        <button class="logout-button" onClick=${onLogout}>Logout</button>
                    </div>
                </div>
            </main>
        </div>
    `;
};


// --- Onboarding for first book ---
const FirstBookJourney = ({ onCreateBook }) => {
    const [title, setTitle] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        setIsLoading(true);
        // Simulate a quick process for better UX
        setTimeout(() => {
            onCreateBook(title);
            setIsLoading(false);
        }, 300);
    };

    return html`
        <div class="first-journey-container">
            <h2>Start Your First Masterpiece</h2>
            <p>Every great story has a beginning. Welcome to LifeScript! Give your first book a name to start chronicling your journey.</p>
            <form class="first-journey-form" onSubmit=${handleSubmit}>
                <input
                    type="text"
                    placeholder="e.g., 'The London Diaries'"
                    value=${title}
                    onInput=${e => setTitle(e.target.value)}
                    required
                    disabled=${isLoading}
                    aria-label="Your first book's title"
                />
                <button type="submit" disabled=${isLoading || !title.trim()}>
                    ${isLoading ? 'Creating...' : 'Create My Book'}
                </button>
            </form>
        </div>
    `;
};

// --- Form for creating new books (for existing users) ---
const CreateBookForm = ({ onCreate, onCancel }) => {
    const [title, setTitle] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        setIsLoading(true);
        // Using a short timeout to give a feeling of processing
        setTimeout(() => {
            onCreate(title);
            // No need to set isLoading to false here, as the component will unmount
        }, 300);
    };

    return html`
        <div class="create-book-form-container">
            <h3>Name Your New Book</h3>
            <form class="create-book-form" onSubmit=${handleSubmit}>
                <input
                    type="text"
                    placeholder="e.g., 'My Travels in Asia'"
                    value=${title}
                    onInput=${e => setTitle(e.target.value)}
                    required
                    disabled=${isLoading}
                    aria-label="New book's title"
                    autoFocus
                />
                <div class="form-actions">
                    <button type="submit" disabled=${isLoading || !title.trim()}>
                        ${isLoading ? 'Creating...' : 'Create Book'}
                    </button>
                    <button type="button" class="secondary" onClick=${onCancel} disabled=${isLoading}>Cancel</button>
                </div>
            </form>
        </div>
    `;
};

// --- Bookshelf Page ---
const BooksListPage = ({ user, onUpdateUser, onSelectBook, onNavigateProfile }) => {
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateBook = useCallback((title) => {
        if (title && title.trim()) {
            const newBook = { id: Date.now(), title, chapters: [] };
            onUpdateUser({ ...user, books: [...user.books, newBook] });
            setIsCreating(false); // Hide form after creation
        }
    }, [user, onUpdateUser]);
    
    const handleRenameBook = (bookToRename) => {
        const newTitle = prompt("Enter the new title for your book:", bookToRename.title);
        if (newTitle && newTitle.trim()) {
            const updatedBooks = user.books.map(book =>
                book.id === bookToRename.id ? { ...book, title: newTitle } : book
            );
            onUpdateUser({ ...user, books: updatedBooks });
        }
    };

    return html`
    <div class="container">
        <${AppHeader} user=${user} onNavigateProfile=${onNavigateProfile} title="My Bookshelf" />
        <main>
            ${user.books.length === 0 ? html`
                <${FirstBookJourney} onCreateBook=${handleCreateBook} />
            ` : html`
                <div class="books-grid">
                    ${user.books.map(book => html`
                        <div class="book-card" key=${book.id}>
                            <h3>${book.title}</h3>
                            <p>${book.chapters.length} ${book.chapters.length === 1 ? 'chapter' : 'chapters'}</p>
                            <div class="book-card-actions">
                               <button onClick=${() => onSelectBook(book.id)}>View Book</button>
                               <button class="secondary" onClick=${() => handleRenameBook(book)}>Rename</button>
                            </div>
                        </div>
                    `)}
                    ${!isCreating && html`
                        <button class="new-book-card" onClick=${() => setIsCreating(true)}>
                            <div class="plus-icon">+</div>
                            <div>Create New Book</div>
                        </button>
                    `}
                </div>
            `}
            ${isCreating && user.books.length > 0 && html`
                <${CreateBookForm} onCreate=${handleCreateBook} onCancel=${() => setIsCreating(false)} />
            `}
        </main>
        ${user.books.length > 0 && html`
            <footer>
                <p>Welcome, ${user.username}! Select a book to continue your story or create a new one.</p>
            </footer>
        `}
    </div>
    `;
};


// --- Book & Chapter Components ---

const ChapterCard = ({ chapter }) => {
  return html`
    <div class="chapter-card" aria-labelledby="chapter-title-${chapter.id}">
      <h2 id="chapter-title-${chapter.id}">Chapter: ${chapter.date}</h2>
      <div class="entry-content">
        <div class="entry-section">
          <h3>Your Thoughts</h3>
          <p>${chapter.rawText}</p>
        </div>
        <div class="story-section">
          <h3>Your Story (Tone: ${chapter.tone})</h3>
          <p class="story-text">${chapter.storyText}</p>
        </div>
      </div>
    </div>
  `;
};

const BookView = ({ book, onClose, onDownloadPdf }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < book.chapters.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const chaptersInOrder = [...book.chapters].reverse();

  return html`
    <div class="book-view">
        <div class="book-header">
            <h2 class="book-title-read">${book.title}</h2>
            <div class="book-header-actions">
              <button class="publish-pdf-button" onClick=${onDownloadPdf} disabled=${chaptersInOrder.length === 0}>Publish & Download PDF</button>
              <button class="close-book-view" onClick=${onClose}>Back to Writing</button>
            </div>
        </div>
        ${chaptersInOrder.length === 0 ? html`
            <div class="chapter-content">
                <p class="empty-book-message">Your book has no chapters yet. Go back and write your first one!</p>
            </div>
        ` : html`
            <div class="chapter-content">
                <h3>Chapter ${currentIndex + 1}: ${chaptersInOrder[currentIndex].date}</h3>
                <p class="story-text">${chaptersInOrder[currentIndex].storyText}</p>
            </div>
            <div class="book-navigation">
                <button onClick=${handlePrev} disabled=${currentIndex === 0}>Previous Chapter</button>
                <span>Page ${currentIndex + 1} of ${chaptersInOrder.length}</span>
                <button onClick=${handleNext} disabled=${currentIndex === chaptersInOrder.length - 1}>Next Chapter</button>
            </div>
        `}
    </div>
  `;
};


const JournalPage = ({ user, initialBook, onUpdateBook, onBack, onNavigateProfile }) => {
  const [book, setBook] = useState(initialBook);
  const [viewMode, setViewMode] = useState('write'); // 'write' or 'read'
  const [currentInput, setCurrentInput] = useState('');
  const [selectedTone, setSelectedTone] = useState('Reflective');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setBook(initialBook);
  }, [initialBook]);

  const handleUpdate = (updatedBook) => {
      setBook(updatedBook);
      onUpdateBook(updatedBook);
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!currentInput.trim()) {
      setError('Please write something before creating a chapter.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const lastChapter = book.chapters.length > 0 ? book.chapters[0] : null;
    let prompt;

    if (lastChapter) {
      prompt = `Your task is to continue a personal memoir by writing a new chapter.
- Tone: ${selectedTone}
- Writing style: Narrative-driven, clear, basic English.
- Grammar: Correct any grammatical errors from the new entry.
- Context: The previous chapter was based on the entry "${lastChapter.rawText}" and resulted in the story: "${lastChapter.storyText}". The new chapter must flow seamlessly from this.
- Output format: You MUST return ONLY the raw story text for the new chapter. Do not include any titles, introductory phrases, or markdown formatting.

New Journal Entry:
"${currentInput}"`;
    } else {
      prompt = `Your task is to transform the following journal entry into the first chapter of a book.
- Tone: ${selectedTone}
- Writing style: Narrative-driven, clear, basic English.
- Grammar: Correct any grammatical errors from the original entry.
- Output format: You MUST return ONLY the raw story text. Do not include any titles (like "Chapter One"), introductory phrases (like "Here is the chapter..."), or markdown formatting.

Journal Entry:
"${currentInput}"`;
    }

    try {
      const response = await ai.models.generateContent({ model, contents: prompt });
      const storyText = response.text;

      const newChapter = {
        id: Date.now(),
        rawText: currentInput,
        storyText,
        tone: selectedTone,
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      };

      const updatedBook = {
        ...book,
        chapters: [newChapter, ...book.chapters],
      };
      handleUpdate(updatedBook);
      setCurrentInput('');
    } catch (err) {
      console.error("Gemini API error:", err);
      setError(err.message || 'Failed to generate story.');
    } finally {
      setIsLoading(false);
    }
  }, [currentInput, selectedTone, book]);

  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    const page_margin = 15;
    const page_width = doc.internal.pageSize.getWidth() - page_margin * 2;
    const page_height = doc.internal.pageSize.getHeight() - page_margin * 2;
    let y_pos = page_margin;

    doc.setFont('times', 'bold');
    doc.setFontSize(24);
    doc.text(book.title, doc.internal.pageSize.getWidth() / 2, y_pos, { align: 'center' });
    y_pos += 20;

    const chaptersInOrder = [...book.chapters].reverse();

    chaptersInOrder.forEach((chapter, index) => {
      if (y_pos > page_height - 30) { // check for space before adding new chapter
        doc.addPage();
        y_pos = page_margin;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      const chapterTitle = `Chapter ${index + 1}: ${chapter.date}`;
      doc.text(chapterTitle, page_margin, y_pos);
      y_pos += 10;

      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const storyLines = doc.splitTextToSize(chapter.storyText, page_width);

      storyLines.forEach(line => {
        if (y_pos > page_height) {
          doc.addPage();
          y_pos = page_margin;
        }
        doc.text(line, page_margin, y_pos);
        y_pos += 7; // line height
      });

      y_pos += 10; // Space between chapters
    });

    doc.save(`${book.title.replace(/\s/g, '_')}.pdf`);
  };

  const TONES = ['Poetic', 'Humorous', 'Dramatic', 'Minimalist', 'Reflective'];

  if (viewMode === 'read') {
    return html`<${BookView} book=${book} onClose=${() => setViewMode('write')} onDownloadPdf=${handleDownloadPdf} />`;
  }

  return html`
    <div class="container">
      <${AppHeader} user=${user} onNavigateProfile=${onNavigateProfile} onBack=${onBack} />

      <main>
        <div class="book-title-container">
            <h1>${book.title}</h1>
            <button id="read-book-button" onClick=${() => setViewMode('read')}>Read My Book</button>
        </div>
        <form class="entry-form" onSubmit=${handleSubmit}>
          <label for="journal-entry">So, what's today like?</label>
          <textarea
            id="journal-entry"
            placeholder="A funny thing happened on the way to the cafe..."
            value=${currentInput}
            onInput=${(e) => setCurrentInput(e.target.value)}
            rows="8"
            aria-label="Daily journal input"
            disabled=${isLoading}
          ></textarea>

          <div class="controls">
            <div class="tone-selector">
              <label for="tone-select">Choose a tone:</label>
              <select id="tone-select" value=${selectedTone} onChange=${(e) => setSelectedTone(e.target.value)} disabled=${isLoading}>
                ${TONES.map(tone => html`<option value=${tone}>${tone}</option>`)}
              </select>
            </div>
            <button type="submit" disabled=${isLoading}>
              ${isLoading ? 'Creating Chapter...' : `Add Chapter`}
            </button>
          </div>
        </form>

        ${isLoading && html`<${Loader} />`}
        ${error && html`<${ErrorMessage} error=${error} />`}

        <div class="entries-list" aria-live="polite">
          ${book.chapters.length === 0 && !isLoading ? html`
            <div class="empty-state">
              <p>Your story awaits. Write your first chapter to begin.</p>
            </div>
          ` : book.chapters.map(chapter => html`<${ChapterCard} key=${chapter.id} chapter=${chapter} />`)}
        </div>
      </main>

      <footer>
        <p>Built with Gemini</p>
      </footer>
    </div>
  `;
}

// --- Main App Controller ---

const App = () => {
  const [view, setView] = useState('auth'); // 'auth', 'booksList', 'journal', 'profile'
  const [user, setUser] = useState(null);
  const [activeBookId, setActiveBookId] = useState(null);

  const getUserDataKey = (username) => `lifescript_userdata_${username}`;

  useEffect(() => {
    const loggedInUsername = sessionStorage.getItem('lifescript_username');
    if (loggedInUsername) {
      const userData = JSON.parse(localStorage.getItem(getUserDataKey(loggedInUsername)));
      if (userData) {
          setUser(userData);
          setView('booksList');
      }
    }
  }, []);

  const updateAndSaveUser = (updatedUser) => {
      setUser(updatedUser);
      localStorage.setItem(getUserDataKey(updatedUser.username), JSON.stringify(updatedUser));
  };

  const handleRegister = (username, password): Promise<void> => {
    return new Promise((resolve, reject) => {
      const users = JSON.parse(localStorage.getItem('lifescript_auth_users')) || [];
      if (users.some(u => u.username === username)) {
        return reject(new Error('Username already exists.'));
      }

      const newAuthUser = { username, password };
      users.push(newAuthUser);
      localStorage.setItem('lifescript_auth_users', JSON.stringify(users));

      const newUser = { username, books: [], profilePicUrl: '' };
      localStorage.setItem(getUserDataKey(username), JSON.stringify(newUser));

      setUser(newUser);
      sessionStorage.setItem('lifescript_username', username);
      setView('booksList');
      resolve();
    });
  };

  const handleLogin = (username, password): Promise<void> => {
     return new Promise((resolve, reject) => {
      const users = JSON.parse(localStorage.getItem('lifescript_auth_users')) || [];
      const foundAuthUser = users.find(u => u.username === username);

      if (foundAuthUser && foundAuthUser.password === password) {
        const userData = JSON.parse(localStorage.getItem(getUserDataKey(username))) || { username, books: [], profilePicUrl: '' };
        setUser(userData);
        sessionStorage.setItem('lifescript_username', username);
        setView('booksList');
        resolve();
      } else {
        reject(new Error('Invalid username or password.'));
      }
    });
  };

  const handleLogout = () => {
    setUser(null);
    setActiveBookId(null);
    sessionStorage.removeItem('lifescript_username');
    setView('auth');
  };

  const handleSelectBook = (bookId) => {
      setActiveBookId(bookId);
      setView('journal');
  };

  const handleUpdateBook = (updatedBook) => {
      const updatedBooks = user.books.map(b => b.id === updatedBook.id ? updatedBook : b);
      updateAndSaveUser({ ...user, books: updatedBooks });
  };

  const handleBackToBooks = () => {
      setActiveBookId(null);
      setView('booksList');
  }

  if (!user) {
    return html`<${AuthPage} onLogin=${handleLogin} onRegister=${handleRegister} />`;
  }

  switch(view) {
    case 'profile':
        return html`<${ProfilePage} user=${user} onSave=${updateAndSaveUser} onBack=${() => setView('booksList')} onLogout=${handleLogout} />`;
    case 'journal':
        const activeBook = user.books.find(b => b.id === activeBookId);
        if (!activeBook) {
            // Failsafe in case active book is not found
            setView('booksList');
            return null;
        }
        return html`<${JournalPage} user=${user} initialBook=${activeBook} onUpdateBook=${handleUpdateBook} onBack=${handleBackToBooks} onNavigateProfile=${() => setView('profile')} />`;
    case 'booksList':
    default:
        return html`<${BooksListPage} user=${user} onUpdateUser=${updateAndSaveUser} onSelectBook=${handleSelectBook} onNavigateProfile=${() => setView('profile')} />`;
  }
};

render(html`<${App} />`, document.getElementById('app'));