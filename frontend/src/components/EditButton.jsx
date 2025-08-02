// components/EditButton.jsx
export default function EditButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-light-primary dark:bg-dark-primary text-white rounded 
        hover:bg-light-secondary dark:hover:bg-dark-secondary transition"
    >
      Edit
    </button>
  );
}
