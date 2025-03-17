import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const SmartTruncatedTags = ({ tags, onTagClick, onEditItem }) => {
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if mobile on mount and on window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint in Tailwind
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!tags || !tags.length) return null;

  // Take first 3 tags
  const displayTags = tags.slice(0, 3).map(tag => ({
    ...tag,
    displayText: isMobile ? tag.text[0] : tag.text // Only first letter on mobile
  }));

  // Add ellipsis if there are more than 3 tags
  if (tags.length > 3) {
    displayTags.push({
      isEllipsis: true,
      text: '...',
      color: 'gray',
      displayText: '...'
    });
  }

  return (
    <div className="flex items-center gap-1">
      {displayTags.map((tag, index) => (
        <button
          key={`${tag.text || 'ellipsis'}-${index}`}
          onClick={(e) => {
            // Prevent event from bubbling up to parent elements
            e.stopPropagation();
            
            if (tag.isEllipsis) {
              onEditItem && onEditItem();
            } else {
              onTagClick && onTagClick(tag);
            }
          }}
          className={`inline-flex items-center text-xs px-2 py-1 bg-${tag.color}-100 dark:bg-${tag.color}-900 text-${tag.color}-800 dark:text-${tag.color}-200 rounded-full whitespace-nowrap hover:bg-${tag.color}-200 dark:hover:bg-${tag.color}-800 transition-colors`}
        >
          {tag.displayText}
        </button>
      ))}
    </div>
  );
};

SmartTruncatedTags.propTypes = {
  tags: PropTypes.arrayOf(PropTypes.shape({
    text: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired
  })).isRequired,
  onTagClick: PropTypes.func,
  onEditItem: PropTypes.func
};

export default SmartTruncatedTags; 