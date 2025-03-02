import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  doc, 
  updateDoc,
  onSnapshot 
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function Grocery() {
  const [user, loading, error] = useAuthState(auth);
  const [groceryLists, setGroceryLists] = useState([]);
  const [currentList, setCurrentList] = useState(null);
  const [newListName, setNewListName] = useState('');
  const [newItem, setNewItem] = useState('');
  const [newCollaborator, setNewCollaborator] = useState('');

  // Fetch user's grocery lists when component loads
  useEffect(() => {
    if (user) {
      const listsRef = collection(db, "groceryLists");
      const q = query(
        listsRef, 
        where("ownerId", "==", user.uid)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const lists = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setGroceryLists(lists);
      });
      
      return () => unsubscribe();
    }
  }, [user]);

  // Create a new grocery list
  const createNewList = async (e) => {
    e.preventDefault();
    if (!newListName.trim() || !user) return;
    
    try {
      await addDoc(collection(db, "groceryLists"), {
        name: newListName,
        ownerId: user.uid,
        createdAt: new Date(),
        collaborators: [],
        items: []
      });
      setNewListName('');
    } catch (error) {
      console.error("Error creating list:", error);
    }
  };

  // Add item to current list
  const addItem = async (e) => {
    e.preventDefault();
    if (!newItem.trim() || !currentList) return;
    
    try {
      const listRef = doc(db, "groceryLists", currentList.id);
      const updatedItems = [...currentList.items, {
        name: newItem,
        completed: false,
        addedBy: user.uid,
        addedAt: new Date()
      }];
      
      await updateDoc(listRef, { items: updatedItems });
      setNewItem('');
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  // Toggle item completion status
  const toggleItem = async (itemIndex) => {
    try {
      const listRef = doc(db, "groceryLists", currentList.id);
      const updatedItems = [...currentList.items];
      updatedItems[itemIndex].completed = !updatedItems[itemIndex].completed;
      
      await updateDoc(listRef, { items: updatedItems });
    } catch (error) {
      console.error("Error toggling item:", error);
    }
  };

  // Add collaborator to current list
  const addCollaborator = async (e) => {
    e.preventDefault();
    if (!newCollaborator.trim() || !currentList) return;
    
    try {
      const listRef = doc(db, "groceryLists", currentList.id);
      const updatedCollaborators = [...currentList.collaborators, newCollaborator];
      
      await updateDoc(listRef, { collaborators: updatedCollaborators });
      setNewCollaborator('');
    } catch (error) {
      console.error("Error adding collaborator:", error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>Please sign in to access the grocery list</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Grocery Lists</h1>
      
      {/* Create new list form */}
      <form onSubmit={createNewList} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New List Name"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            className="flex-1 p-2 border rounded"
          />
          <button 
            type="submit"
            className="bg-primary text-white px-4 py-2 rounded"
          >
            Create List
          </button>
        </div>
      </form>
      
      {/* List of grocery lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {groceryLists.length === 0 ? (
          <p>You don&apos;t have any grocery lists yet</p>
        ) : (
          groceryLists.map(list => (
            <div 
              key={list.id} 
              className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 
                ${currentList?.id === list.id ? 'bg-primary/10 border-primary' : ''}`}
              onClick={() => setCurrentList(list)}
            >
              <h2 className="text-xl font-bold">{list.name}</h2>
              <p className="text-sm text-gray-500">
                {list.items.length} items · {list.collaborators.length} collaborators
              </p>
            </div>
          ))
        )}
      </div>
      
      {/* Current list details */}
      {currentList && (
        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{currentList.name}</h2>
          </div>
          
          {/* Add item form */}
          <form onSubmit={addItem} className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add new item"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                className="flex-1 p-2 border rounded"
              />
              <button 
                type="submit"
                className="bg-primary text-white px-4 py-2 rounded"
              >
                Add
              </button>
            </div>
          </form>
          
          {/* List items */}
          <ul className="mb-8">
            {currentList.items.length === 0 ? (
              <p>No items in this list yet</p>
            ) : (
              currentList.items.map((item, index) => (
                <li 
                  key={index}
                  className="flex items-center p-3 border-b"
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => toggleItem(index)}
                    className="mr-3"
                  />
                  <span className={item.completed ? 'line-through text-gray-500' : ''}>
                    {item.name}
                  </span>
                </li>
              ))
            )}
          </ul>
          
          {/* Collaborators section */}
          <div className="mt-8 border-t pt-4">
            <h3 className="text-xl font-bold mb-4">Collaborators</h3>
            <form onSubmit={addCollaborator} className="mb-4">
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Add collaborator by email"
                  value={newCollaborator}
                  onChange={(e) => setNewCollaborator(e.target.value)}
                  className="flex-1 p-2 border rounded"
                />
                <button 
                  type="submit"
                  className="bg-primary text-white px-4 py-2 rounded"
                >
                  Add
                </button>
              </div>
            </form>
            
            <ul>
              {currentList.collaborators.length === 0 ? (
                <p>No collaborators yet</p>
              ) : (
                currentList.collaborators.map((email, index) => (
                  <li key={index} className="p-2">
                    {email}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
} 