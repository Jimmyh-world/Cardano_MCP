document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const form = document.getElementById('process-form');
  const submitBtn = document.getElementById('submit-btn');
  const contentList = document.getElementById('content-list');
  const processingStatus = document.getElementById('processing-status');

  // Active jobs tracking
  const activeJobs = new Map();

  // Load existing jobs
  loadJobs();

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Disable form while processing
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    // Get form data
    const url = document.getElementById('url').value;
    const type = document.querySelector('input[name="type"]:checked').value;
    const name = document.getElementById('name').value;

    try {
      // Submit job to API
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, type, name }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();

      // Track new job
      activeJobs.set(data.jobId, {
        id: data.jobId,
        url,
        type,
        name: name || getNameFromUrl(url),
        status: 'processing',
        startTime: new Date(),
      });

      // Update UI with new job
      updateJobsUI();

      // Start polling for this job
      pollJobStatus(data.jobId);

      // Reset form
      form.reset();
    } catch (error) {
      showError(`Failed to submit job: ${error.message}`);
    } finally {
      // Re-enable form
      submitBtn.disabled = false;
      submitBtn.textContent = 'Process';
    }
  });

  // Function to poll job status
  function pollJobStatus(jobId) {
    const statusPoll = setInterval(async () => {
      try {
        // Don't continue polling if job is no longer tracked
        if (!activeJobs.has(jobId)) {
          clearInterval(statusPoll);
          return;
        }

        const response = await fetch(`/api/status/${jobId}`);
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();

        // Update job data
        const job = activeJobs.get(jobId);
        job.status = data.status;

        if (data.results) {
          job.results = data.results;
        }

        // Update UI
        updateJobsUI();

        // If job is completed or errored, stop polling
        if (data.status === 'completed' || data.status === 'error') {
          clearInterval(statusPoll);
        }
      } catch (error) {
        console.error(`Error polling job ${jobId}:`, error);

        // Update job to error state
        if (activeJobs.has(jobId)) {
          const job = activeJobs.get(jobId);
          job.status = 'error';
          job.error = error.message;
          updateJobsUI();
        }

        clearInterval(statusPoll);
      }
    }, 2000); // Poll every 2 seconds
  }

  // Function to load existing jobs
  async function loadJobs() {
    try {
      const response = await fetch('/api/jobs');
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const jobs = await response.json();

      // Clear existing jobs
      activeJobs.clear();

      // Add jobs to tracking
      jobs.forEach((job) => {
        activeJobs.set(job.id, job);

        // If job is still processing, start polling
        if (job.status === 'processing') {
          pollJobStatus(job.id);
        }
      });

      // Update UI
      updateJobsUI();
    } catch (error) {
      console.error('Error loading jobs:', error);
      showError(`Failed to load jobs: ${error.message}`);
    }
  }

  // Function to update UI with current jobs
  function updateJobsUI() {
    // Check if we have any jobs
    if (activeJobs.size === 0) {
      contentList.innerHTML = '<p class="empty-message">No content has been processed yet</p>';
      processingStatus.innerHTML = '';
      return;
    }

    // Count processing jobs
    const processingCount = Array.from(activeJobs.values()).filter(
      (job) => job.status === 'processing',
    ).length;

    // Update processing status
    if (processingCount > 0) {
      processingStatus.innerHTML = `
        <div class="processing-info">
          <p><strong>${processingCount}</strong> content source${processingCount > 1 ? 's' : ''} currently processing</p>
          <div class="progress-container">
            <div class="progress-bar" style="width: 80%"></div>
          </div>
        </div>
      `;
    } else {
      processingStatus.innerHTML = '';
    }

    // Generate jobs list HTML
    const jobsHtml = Array.from(activeJobs.values())
      .sort((a, b) => {
        // Sort by status (processing first), then by start time (newest first)
        if (a.status === 'processing' && b.status !== 'processing') return -1;
        if (a.status !== 'processing' && b.status === 'processing') return 1;

        // If startTime exists, sort by it
        if (a.startTime && b.startTime) {
          return new Date(b.startTime) - new Date(a.startTime);
        }
        return 0;
      })
      .map((job) => {
        // Create HTML for each job
        return `
          <div class="content-item">
            <h3>${job.name || getNameFromUrl(job.url)}</h3>
            <p>${job.url}</p>
            <p>Type: ${job.type === 'documentation' ? 'Documentation' : 'Repository'}</p>
            ${job.results ? `<p>Results: ${formatResults(job)}</p>` : ''}
            <div class="content-meta">
              <span>Started: ${formatTime(job.startTime)}</span>
              <span class="content-status status-${job.status}">${capitalize(job.status)}</span>
            </div>
            ${job.error ? `<p class="error-message">Error: ${job.error}</p>` : ''}
          </div>
        `;
      })
      .join('');

    contentList.innerHTML = jobsHtml;
  }

  // Format time helper
  function formatTime(timestamp) {
    if (!timestamp) return 'Unknown';

    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }

  // Capitalize helper
  function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  // Format results helper
  function formatResults(job) {
    if (!job.results) return '';

    if (job.type === 'documentation') {
      return `${job.results.files || 0} files processed`;
    } else {
      return `${job.results.files || 0} files indexed`;
    }
  }

  // Show error helper
  function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;

    processingStatus.innerHTML = '';
    processingStatus.appendChild(errorDiv);

    // Remove after 5 seconds
    setTimeout(() => {
      if (processingStatus.contains(errorDiv)) {
        processingStatus.removeChild(errorDiv);
      }
    }, 5000);
  }

  // Helper function to get a name from URL
  function getNameFromUrl(url) {
    try {
      const urlObj = new URL(url);

      // For GitHub repos
      if (urlObj.hostname === 'github.com') {
        const parts = urlObj.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
          return `${parts[1]} Repository`;
        }
      }

      // For documentation
      return `${urlObj.hostname} Documentation`;
    } catch (err) {
      return url;
    }
  }
});
