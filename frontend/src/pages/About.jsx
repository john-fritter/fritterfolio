import { FaLinkedin, FaGithub } from "react-icons/fa";
import { MdEmail, MdDescription } from "react-icons/md";

const About = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-primary-dm text-4xl font-bold">About Me</h1>
      
      <p className="text-secondary-dm text-lg leading-relaxed">
        Hi, I&apos;m John Fritter.
        <br />
        <br />
        I like figuring things out and making things work. Sometimes that&apos;s software, sometimes it&apos;s hardware, sometimes it&apos;s just a better way to do something. I&apos;ve worked in semiconductor manufacturing, built full-stack apps, and spent too much time messing with gadgets and robots and tools and games. I like learning, I like solving problems, and I like making things that didn&apos;t exist before.
      </p>
      
      <div className="space-y-4">
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
  );
};

export default About;
  