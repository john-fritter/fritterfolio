// Constants
export const MAX_NAME_LENGTH = 30;
export const MAX_TAG_LENGTH = 8;

// Validation constants
export const VALID_ITEM_NAME_REGEX = /^[a-zA-Z0-9\s\-_.,!?&()']+$/;
export const VALID_TAG_NAME_REGEX = /^[a-zA-Z0-9\-_]+$/;
export const VALID_LIST_NAME_REGEX = /^[a-zA-Z0-9\s\-_.,!?]+$/;

// Validation helper functions
export const validateItemName = (name) => {
  if (!name.trim()) {
    return { isValid: false, error: "Item name cannot be empty" };
  }
  if (name.trim().length > MAX_NAME_LENGTH) {
    return { isValid: false, error: `Item name cannot exceed ${MAX_NAME_LENGTH} characters` };
  }
  if (!VALID_ITEM_NAME_REGEX.test(name.trim())) {
    return { isValid: false, error: "Item name can only contain letters, numbers, spaces, and basic punctuation (.-_,!?&()'" };
  }
  return { isValid: true };
};

export const validateTagName = (name) => {
  if (!name.trim()) {
    return { isValid: false, error: "Tag name cannot be empty" };
  }
  if (name.trim().length > MAX_TAG_LENGTH) {
    return { isValid: false, error: `Tag name cannot exceed ${MAX_TAG_LENGTH} characters` };
  }
  if (!VALID_TAG_NAME_REGEX.test(name.trim())) {
    return { isValid: false, error: "Tags can only contain letters, numbers, hyphens, and underscores" };
  }
  return { isValid: true };
};

export const validateListName = (name) => {
  if (!name.trim()) {
    return { isValid: false, error: "List name cannot be empty" };
  }
  if (name.trim().length > MAX_NAME_LENGTH) {
    return { isValid: false, error: `List name cannot exceed ${MAX_NAME_LENGTH} characters` };
  }
  if (!VALID_LIST_NAME_REGEX.test(name.trim())) {
    return { isValid: false, error: "List name can only contain letters, numbers, spaces, and basic punctuation (.-_,!?)" };
  }
  return { isValid: true };
}; 