import { useEffect, useState } from 'react';

interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

const API_URL = '/api/notes';

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchNotes = async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Could not load notes.');
      setNotes(await response.json());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load notes.');
    }
  };

  useEffect(() => {
    void fetchNotes();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setLoading(true);
    setError('');

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      if (!response.ok) throw new Error('Could not save this note.');
      setTitle('');
      setContent('');
      await fetchNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this note.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="vault">
      <header className="page-header">
        <p className="eyebrow">A place for your thoughts</p>
        <h1>Friend Note Vault</h1>
        <p>Write it down. Keep it close.</p>
      </header>

      <form className="note-form" onSubmit={handleSubmit}>
        <label htmlFor="note-title">Title</label>
        <input
          id="note-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="A few words to find it later"
          required
        />

        <label htmlFor="note-content">Note</label>
        <textarea
          id="note-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="What's on your mind?"
          rows={5}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save note'}
        </button>
      </form>

      <section className="saved-notes" aria-labelledby="saved-heading">
        <div className="section-heading">
          <h2 id="saved-heading">Saved notes</h2>
          <span>{notes.length}</span>
        </div>
        {error && <p className="error-message" role="alert">{error}</p>}
        {!error && notes.length === 0 && (
          <p className="empty-state">No notes yet. Your first one can start here.</p>
        )}
        {notes.map((note) => (
          <article className="note-entry" key={note.id}>
            <h3>{note.title}</h3>
            <p>{note.content}</p>
            <time dateTime={note.created_at}>
              {new Date(note.created_at).toLocaleString()}
            </time>
          </article>
        ))}
      </section>
    </main>
  );
}

export default App;