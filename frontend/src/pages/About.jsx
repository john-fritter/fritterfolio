import { FaLinkedin, FaGithub } from "react-icons/fa";
import { MdEmail, MdDescription } from "react-icons/md";

const About = () => {
  return (
    <div className="flex items-center justify-center h-full w-full overflow-hidden">
      <div className="p-4 max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-primary-dm">About Me</h1>
        <p className="mt-4 text-secondary-dm">
          Hi, I&apos;m John Fritter.
          <br />
          <br />
          I like figuring things out and making things work. Sometimes that&apos;s software, sometimes it&apos;s hardware, sometimes it&apos;s just a better way to do something. I&apos;ve worked in semiconductor manufacturing, built full-stack apps, and spent too much time messing with gadgets and robots and tools and games. I like learning, I like solving problems, and I like making things that didn&apos;t exist before.
        </p>
        
        <div className="flex flex-col gap-4 mt-4">
          <h2 className="text-primary-dm text-2xl font-semibold">Connect With Me</h2>
          <div className="flex gap-6">
            <a
              href="https://linkedin.com/in/john-fritter"
              target="_blank"
              rel="noopener noreferrer"
              title="Connect on LinkedIn"
              className="text-secondary-dm hover:text-accent-dm transition-colors text-2xl"
            >
              <FaLinkedin />
            </a>
            <a
              href="https://github.com/john-fritter"
              target="_blank"
              rel="noopener noreferrer"
              title="View GitHub Profile"
              className="text-secondary-dm hover:text-accent-dm transition-colors text-2xl"
            >
              <FaGithub />
            </a>
            <a
              href="mailto:jefritter@gmail.com"
              title="Send Email"
              className="text-secondary-dm hover:text-accent-dm transition-colors text-2xl"
            >
              <MdEmail />
            </a>
            <a
              href="https://drive.google.com/file/d/1Bqm5Y0Cj8sS-HVqUbrLUbnlo1pT2KVdH/view?usp=sharing"
              download
              title="View My Resume"
              className="text-secondary-dm hover:text-accent-dm transition-colors text-2xl"
            >
              <MdDescription />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
  