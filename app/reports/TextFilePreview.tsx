// TextFilePreview component
function TextFilePreview({ filePath, filename, apiBase, evidenceId }: { 
  filePath: string; 
  filename: string;
  apiBase: string;
  evidenceId: number;
}) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadTextContent() {
      try {
        // Try to fetch via API first
        const response = await fetch(`${apiBase}/api/evidence-file/${evidenceId}`);
        if (response.ok) {
          const text = await response.text();
          setContent(text.slice(0, 2000)); // Limit preview length
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadTextContent();
  }, [apiBase, evidenceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-gray-400">
        <FileText className="h-8 w-8 mx-auto mb-2" />
        <p className="text-sm">Preview not available</p>
        <p className="text-xs mt-1">{filename}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <pre className="text-xs whitespace-pre-wrap font-mono">
        {content}
        {content.length >= 2000 && (
          <span className="text-yellow-400 block mt-2">
            ... (content truncated, download to view full file)
          </span>
        )}
      </pre>
    </div>
  );
}