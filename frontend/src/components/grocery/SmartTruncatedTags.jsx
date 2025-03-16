import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const SmartTruncatedTags = ({ tags, onTagClick }) => {
  const [truncatedTags, setTruncatedTags] = useState(tags);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [itemNameWidth, setItemNameWidth] = useState(0);

  // Update measurements when container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const updateMeasurements = () => {
      const itemNameElement = containerRef.current.previousElementSibling;
      if (itemNameElement) {
        setItemNameWidth(itemNameElement.offsetWidth + 8);
      }
    };

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
        updateMeasurements();
      }
    });

    resizeObserver.observe(containerRef.current);
    updateMeasurements(); // Initial measurement

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Update measurements when tags change
  useEffect(() => {
    if (!containerRef.current) return;

    const itemNameElement = containerRef.current.previousElementSibling;
    if (itemNameElement) {
      setItemNameWidth(itemNameElement.offsetWidth + 8);
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, [tags]);

  // Calculate truncated tags whenever dependencies change
  useEffect(() => {
    if (!containerWidth) return;

    const measureText = (text, isTag = false) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.font = isTag ? '12px sans-serif' : '16px sans-serif';
      const metrics = context.measureText(text);
      // Add padding for tags (24px for horizontal padding + 4px for gap)
      return isTag ? metrics.width + 28 : metrics.width;
    };

    const availableWidth = containerWidth - itemNameWidth;
    if (availableWidth <= 0) {
      setTruncatedTags([]);
      return;
    }

    let currentTags = [...tags];
    let totalWidth = currentTags.reduce((sum, tag) => sum + measureText(tag.text, true), 0);

    // If tags fit, no need to truncate
    if (totalWidth <= availableWidth) {
      setTruncatedTags(currentTags.map(tag => ({
        ...tag,
        displayText: tag.text,
      })));
      return;
    }

    // Find the maximum possible balanced length for all tags
    const findBalancedLength = () => {
      const maxLength = Math.max(...currentTags.map(tag => tag.text.length));
      
      // Binary search for the optimal length
      let left = 2; // Minimum 2 characters
      let right = maxLength;
      let bestLength = left;
      
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const truncatedTags = currentTags.map(tag => ({
          ...tag,
          text: tag.text.slice(0, Math.min(tag.text.length, mid))
        }));
        
        const width = truncatedTags.reduce((sum, tag) => sum + measureText(tag.text, true), 0);
        
        if (width <= availableWidth) {
          bestLength = mid;
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }
      
      return bestLength;
    };

    const balancedLength = findBalancedLength();
    
    // Apply the balanced length to all tags
    const finalTags = currentTags.map(tag => ({
      ...tag,
      displayText: tag.text.slice(0, balancedLength),
      text: tag.text // preserve original text
    }));

    setTruncatedTags(finalTags);
  }, [tags, containerWidth, itemNameWidth]);

  return (
    <div ref={containerRef} className="flex-1 min-w-0">
      <div className="flex items-center justify-end gap-1">
        {truncatedTags.map((tag, index) => (
          <button
            key={`${tag.text}-${index}`}
            onClick={() => onTagClick?.(tag)}
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
  onTagClick: PropTypes.func
};

export default SmartTruncatedTags; 