import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const SmartTruncatedTags = ({ tags, onTagClick, onEditItem }) => {
  const [displayTags, setDisplayTags] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef(null);
  
  // Check if mobile on mount and on window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint in Tailwind
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Calculate item name length
  const getItemNameLength = () => {
    if (!containerRef.current) return 0;
    
    const row = containerRef.current.closest('.flex.items-center.min-w-0');
    if (!row) return 0;
    
    const nameElement = row.querySelector('.flex-none span');
    if (!nameElement) return 0;
    
    return nameElement.textContent.trim().length;
  };
  
  // Update display tags when tags change or mobile state changes
  useEffect(() => {
    if (!tags || !tags.length) {
      setDisplayTags([]);
      return;
    }
    
    // Initial setup - we'll refine this after measuring the name length
    const hasMoreTags = tags.length > 3;
    const tagsToProcess = tags.slice();
    
    setTimeout(() => {
      const nameLength = getItemNameLength();
      
      // Calculate how many tags to show and their max length
      let tagsToShow = [];
      let maxTagLength = 0;
      let showEllipsis = false;
      
      if (isMobile) {
        // Mobile rules
        if (nameLength > 24) {
          // Very long name on mobile
          if (tags.length === 1) {
            // Just show the first letter of the single tag
            tagsToShow = tags.slice(0, 1);
            maxTagLength = 1;
          } else {
            tagsToShow = [];
            showEllipsis = true;
          }
        } else if (nameLength > 16) {
          // Long name on mobile
          if (tags.length <= 3) {
            tagsToShow = tags.slice(0, 3);
            maxTagLength = Math.max(1, 6 - Math.floor(nameLength - 18) - tags.length);
          } else {
            tagsToShow = tags.slice(0, 3);
            maxTagLength = 2;
            showEllipsis = true;
          }
        } else {
          // Shorter name on mobile
          if (tags.length <= 3) {
            // 1-3 tags: show all with adaptive length
            tagsToShow = tags.slice(0, 3);
            maxTagLength = Math.max(1, 6 - Math.floor(nameLength - 24) - tags.length);
          } else {
            // 4+ tags: show first 3 + ellipsis
            tagsToShow = tags.slice(0, 3);
            maxTagLength = Math.max(1, 4 - Math.floor(nameLength / 8));
            showEllipsis = true;
          }
        }
      } else {
        // Desktop rules
        tagsToShow = tags.slice(0, 3);
        showEllipsis = true;
        maxTagLength = 8;
      }
      
      // Round maxTagLength to the nearest integer
      maxTagLength = Math.max(1, Math.round(maxTagLength));
      
      // Create display tags with truncated text
      const processedTags = tagsToShow.map(tag => ({
        ...tag,
        displayText: tag.text.length > maxTagLength ? 
                     tag.text.substring(0, maxTagLength) : 
                     tag.text
      }));
      
      // Add ellipsis tag if needed
      if (showEllipsis) {
        processedTags.push({
          isEllipsis: true,
          text: '...',
          color: 'gray',
          displayText: '...'
        });
      }
      
      setDisplayTags(processedTags);
    }, 100); // Delay to ensure DOM is ready for measurement
    
    // Initial render with full tags
    const initialTags = tagsToProcess.slice(0, 3).map(tag => ({
      ...tag,
      displayText: tag.text
    }));
    
    if (hasMoreTags) {
      initialTags.push({
        isEllipsis: true,
        text: '...',
        color: 'gray',
        displayText: '...'
      });
    }
    
    setDisplayTags(initialTags);
  }, [tags, isMobile]);
  
  if (!displayTags || !displayTags.length) return null;
  
  return (
    <div ref={containerRef} className="flex-1 min-w-0">
      <div className="flex items-center justify-end gap-1 overflow-hidden">
        {displayTags.map((tag, index) => (
          <button
            key={`${tag.text || 'ellipsis'}-${index}`}
            onClick={() => {
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