import { getAuthHeader } from './auth';

export const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api'
  : `http://${window.location.hostname}:5000/api`;

// Get all grocery lists for a user
export const getGroceryLists = async () => {
  const headers = { ...getAuthHeader(), 'Content-Type': 'application/json' };
  const response = await fetch(`${API_URL}/grocery-lists`, {
    headers
  });
  if (!response.ok) throw new Error('Failed to fetch grocery lists');
  return response.json();
};

// Create a new grocery list
export const createGroceryList = async (name) => {
  const headers = { ...getAuthHeader(), 'Content-Type': 'application/json' };
  const response = await fetch(`${API_URL}/grocery-lists`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name })
  });
  if (!response.ok) throw new Error('Failed to create grocery list');
  return response.json();
};

// Get all items for a grocery list
export const getGroceryItems = async (listId) => {
  const headers = { ...getAuthHeader() };
  const response = await fetch(`${API_URL}/grocery-lists/${listId}/items`, {
    headers
  });
  if (!response.ok) throw new Error('Failed to fetch grocery items');
  return response.json();
};

// Add item to a grocery list
export const addGroceryItem = async (listId, name) => {
  const headers = { ...getAuthHeader(), 'Content-Type': 'application/json' };
  const response = await fetch(`${API_URL}/grocery-lists/${listId}/items`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name })
  });
  if (!response.ok) throw new Error('Failed to add grocery item');
  return response.json();
};

// Update a grocery item
export const updateGroceryItem = async (itemId, updates) => {
  const headers = { ...getAuthHeader(), 'Content-Type': 'application/json' };
  const response = await fetch(`${API_URL}/grocery-items/${itemId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates)
  });
  if (!response.ok) throw new Error('Failed to update grocery item');
  return response.json();
};

// Delete a grocery item
export const deleteGroceryItem = async (itemId) => {
  const headers = { ...getAuthHeader() };
  const response = await fetch(`${API_URL}/grocery-items/${itemId}`, {
    method: 'DELETE',
    headers
  });
  if (!response.ok) throw new Error('Failed to delete grocery item');
  return response.json();
};

// Get master list for a user
export const getMasterList = async () => {
  const headers = { ...getAuthHeader() };
  const response = await fetch(`${API_URL}/master-list`, {
    headers
  });
  if (!response.ok) throw new Error('Failed to fetch master list');
  return response.json();
};

// Add item to master list
export const addMasterListItem = async (name) => {
  const headers = { ...getAuthHeader(), 'Content-Type': 'application/json' };
  const response = await fetch(`${API_URL}/master-list/items`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name })
  });
  if (!response.ok) throw new Error('Failed to add master list item');
  return response.json();
};

// Delete a grocery list
export const deleteGroceryList = async (listId) => {
  const response = await fetch(`${API_URL}/grocery-lists/${listId}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete grocery list');
  return response.json();
};

// Update a master list item
export const updateMasterListItem = async (itemId, updates) => {
  const response = await fetch(`${API_URL}/master-list-items/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!response.ok) throw new Error('Failed to update master list item');
  return response.json();
};

// Delete a master list item
export const deleteMasterListItem = async (itemId) => {
  const response = await fetch(`${API_URL}/master-list-items/${itemId}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete master list item');
  return response.json();
};

// Add this function to your api.js file
export const clearMasterList = async (userId) => {
  try {
    const response = await fetch(`${API_URL}/users/${userId}/master-list/clear`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to clear master list');
    }
    
    return true;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Ensure we have a proper way to get the auth token
const getAuthToken = () => {
  return localStorage.getItem('token') || '';
}; 